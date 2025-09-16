import { Pool } from "pg";
import { DatabaseError } from "pg-protocol";

class Database {
  static instance = null;

  constructor(param) {
    if (Database.instance) {
      return Database.instance;
    }

    this.pool = new Pool(param);

    Database.instance = this;
  }

  query(query, param) {
    return this.pool.query(query, param);
  }

  loadClasses(classList) {
    for (const cls of classList) {
      if (cls.descriptor === null)
        throw new Error(`descriptor not defined for ${cls.name}`);

      const des = cls.descriptor;
      if (!des.table || !des.primaryKey || des.primaryKey.length === 0)
        throw new Error(`Improper descriptor in ${cls.name}`);

      // create a prototype template for each property

      Object.keys(des).forEach(key => {
        if (key === "table" || key === "primaryKey" || key === "foreignKey") {
          //console.log(`skipping ${key}`);
          return;
        }
        // console.log(`${key}`);
        cls.prototype[key] = null;
      });

      // foreign keys
      if (des.foreignKey) {
        const nested = Object.keys(des.foreignKey);
        for (let i = 0; i < nested.length; i++) {
          cls.prototype[nested[i]] = null;
        }
      }
    }
  }
}

export default Database;
