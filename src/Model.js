import Database from "./DB.js";

//new Database({});
class Model {
  static descriptor = null;
  static entityMap = null;

  //example descriptor

  // {
  //     table:"Table_name",
  //     primaryKey:["primary_key1","primary_key2"],
  //     foreignKey:{nestedObj1:{target:TargetTable,keys:{s1:t1,s2:t2}},nestedObj2:{target:TargetTable,keys:{s1:t1,s2:t2}},
  //     id:"coreponding_col_in_Table",
  //     rollNo:"roll_no"
  //     p1:"primary_key1"
  //     p2:"primary_key2"

  // }

  constructor() {}

  getPrimaryKey() {
    const des = this.constructor.descriptor;
    const ans = {};
    for (let key in this) {
      if (des.primaryKey.includes(des[key])) ans[des[key]] = this[key];
    }

    return ans;
  }
  async save(recursive = false, visited = new WeakSet()) {
    if (visited.has(this)) return;
    visited.add(this);
    const des = this.constructor.descriptor;

    // Build row for this object
    const row = {};
    for (const key of Object.keys(des)) {
      if (["table", "primaryKey", "foreignKey"].includes(key)) continue;
      row[des[key]] = this[key];
    }

    // Handle foreign keys
    if (des.foreignKey) {
      for (const nestedKey of Object.keys(des.foreignKey)) {
        const nestedObj = this[nestedKey];
        if (!nestedObj) continue;

        // If recursive flag is true, save nested object first
        if (recursive) {
          console.log(`save called on ${nestedObj.constructor.name}`);
          await nestedObj.save(true, visited);
        }

        // Map nested primary key columns to this object's foreign key columns
        const nestedPK = nestedObj.getPrimaryKey(); // {tarCol: value}
        const fkMap = des.foreignKey[nestedKey].keys; // {srcCol: tarCol}
        for (const [srcCol, tarCol] of Object.entries(fkMap)) {
          row[srcCol] = nestedPK[tarCol];
        }
      }
    }

    // Build INSERT ... ON CONFLICT ... DO UPDATE
    const cols = Object.keys(row);
    const values = Object.values(row);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    const updateClause = cols.map(c => `${c} = EXCLUDED.${c}`).join(", ");
    const sql = `
      INSERT INTO ${des.table} (${cols.join(", ")})
      VALUES (${placeholders.join(", ")})
      ON CONFLICT (${des.primaryKey.join(", ")})
      DO UPDATE SET ${updateClause}
      RETURNING *;
    `;

    const res = await new Database().pool.query(sql, values);

    // Update entityMap cache
    const pkKey = Object.values(this.getPrimaryKey()).join("::");
    if (this.constructor.entityMap) this.constructor.entityMap.set(pkKey, this);

    return this;
  }
  static async find(primaryKeyValues) {
    const des = this.descriptor;

    // Extract values in correct order
    const values = des.primaryKey.map(col => {
      if (!(col in primaryKeyValues)) {
        throw new Error(`Missing value for primary key column: ${col}`);
      }
      return primaryKeyValues[col];
    });

    values.sort();

    // Cache check
    const cacheKey = values.join("::");
    if (this.entityMap && this.entityMap.has(cacheKey)) {
      return this.entityMap.get(cacheKey);
    }

    // Build query
    const whereClauses = des.primaryKey.map((col, i) => `${col} = $${i + 1}`);
    const sql = `SELECT * FROM ${des.table} WHERE ${whereClauses.join(
      " AND "
    )}`;

    const res = await new Database({}).pool.query(sql, values);
    // console.log(`result of find where`);
    // console.log(res.rows);
    if (res.rows.length === 0) return null;

    const row = res.rows[0];

    // Build instance
    const obj = new this();

    for (let key in obj) {
      if (Object.keys(des.foreignKey || {}).includes(key)) continue;
      const colName = des[key];
      obj[key] = row[colName];
    }
    if (this.entityMap) this.entityMap.set(cacheKey, obj);

    // Foreign keys
    const nested = Object.keys(des.foreignKey || {});
    for (let i = 0; i < nested.length; i++) {
      const targetClass = des.foreignKey[nested[i]].target;
      const map = des.foreignKey[nested[i]].keys;

      const foreignKey = {};
      for (let srcCol of Object.keys(map)) {
        const tarCol = map[srcCol];
        foreignKey[tarCol] = row[srcCol];
      }

      obj[nested[i]] = await targetClass.find(foreignKey);
    }

    return obj;
  }

  async delete(recursive = false, visited = new WeakSet()) {
    if (visited.has(this)) return;
    visited.add(this);

    const des = this.constructor.descriptor;

    // --- Step 2: Delete this object from DB ---
    const pk = this.getPrimaryKey(); // {colName: value}
    const cols = Object.keys(pk);
    const values = Object.values(pk);
    if (cols.length === 0) throw new Error("Primary key not found for delete");

    const whereClause = cols.map((c, i) => `${c} = $${i + 1}`).join(" AND ");
    const sql = `DELETE FROM ${des.table} WHERE ${whereClause}`;

    await new Database().pool.query(sql, values);
    // console.log(`delete success on ${this.constructor.name}`);
    // --- Step 1: Handle recursive deletes for nested objects FIRST ---
    if (recursive && des.foreignKey) {
      for (const nestedKey of Object.keys(des.foreignKey)) {
        const nestedObj = this[nestedKey];
        if (!nestedObj) continue;

        //   console.log(`delete called on ${nestedObj.constructor.name}`);
        await nestedObj.delete(true, visited);
      }
    }

    // --- Step 3: Remove from entityMap cache ---
    const pkKey = Object.values(pk).join("::");
    if (this.constructor.entityMap) this.constructor.entityMap.delete(pkKey);

    return true;
  }

  static getInstance(row, recursive = true) {
    //console.log(`${this}`);
    const des = this.descriptor;
    const primaryKey = [];
    for (let i = 0; i < des.primaryKey.length; i++) {
      primaryKey.push(row[des.primaryKey[i]]);
    }
    if (this.entityMap && this.entityMap.has(primaryKey.join("::")))
      return this.entityMap.get(primaryKey.join("::"));
    const obj = new this();
    for (let key in obj) {
      if (key === "table" || key === "primaryKey" || key === "foreignKey")
        continue;
      const colName = des[key];
      obj[key] = row[colName];
    }
    if (obj.constructor.entityMap)
      obj.constructor.entityMap.set(primaryKey.join("::"), obj);
    const nested = Object.keys(des.foreignKey);
    if (recursive === true) {
      for (let i = 0; i < nested.length; i++) {
        const targetClass = des.foreignKey[nested[i]].target;
        obj[nested[i]] = targetClass.getInstance(row);
      }
    }
    return obj;
  }
}

export default Model;
