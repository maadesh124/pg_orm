# 📦 Postgres ORM

A lightweight, recursive, relational ORM for PostgreSQL with caching support in Node.js. Save, delete, query objects and their relationships in a simple and intuitive way. 🚀

---

## 🔹 Features

- Automatic mapping between JavaScript classes and PostgreSQL tables.
- Support for primary and foreign keys.
- Recursive `save` and `delete` for nested objects.
- Optional caching via `entityMap`.
- Execute raw SQL when needed.
- Convert raw SQL rows to objects using `getInstance`.

---

## 💻 Installation

```bash
npm install @maadesh124/pg-orm
```

---

## ⚡ Usage

### 1. Setup Database Connection

```javascript
import { Database } from "@maadesh124/pg-orm";

const cred = {
  user: "postgres",
  host: "localhost",
  database: "ORMDB",
  password: "password",
  port: 5432
};

const db = new Database(cred);
```

### 2. Define Models

```javascript
import { Model } from "@maadesh124/pg-orm";

class Subject extends Model {
  static entityMap = new Map();
  static descriptor = {
    table: "SUBJECTS",
    primaryKey: ["sub_id"],
    foreignKey: {},
    id: "sub_id",
    name: "sub_name"
  };
}

class Student extends Model {
  static entityMap = new Map();
  static descriptor = {
    table: "STUDENTS",
    primaryKey: ["id"],
    foreignKey: { sub1: { target: Subject, keys: { sub_id: "sub_id" } } },
    id: "id",
    rollNo: "roll_no"
  };
}

db.loadClasses([Subject, Student]);
```

### 3. Create and Save Objects

```javascript
const sub = new Subject();
sub.id = 6;
sub.name = "Differential Equations";

const stud = new Student();
stud.id = 32;
stud.rollNo = "BDFDSA";
stud.sub1 = sub;

await stud.save(true); // Recursive save
```

### 4. Query Objects

```javascript
const sub1 = await Subject.find({ sub_id: 6 });
console.log(sub1 === sub); // true if cached
```

### 5. Delete Objects

```javascript
await stud.delete(true); // Recursive delete
```

### 6. Execute Raw SQL

```javascript
const res = await db.query("SELECT * FROM students WHERE id = $1", [32]);
console.log(res.rows);
```

### 7. Convert Raw SQL Row to Object

```javascript
const obj = Student.getInstance(res.rows[0]);
console.log(obj instanceof Student); // true
```

---

## 📝 Example Database State

**Initial Database:**

```text
Students:
[
  { id: 101, roll_no: 'ROLL001', sub_id: 1 },
  { id: 102, roll_no: 'ROLL002', sub_id: 2 },
  { id: 103, roll_no: 'ROLL003', sub_id: 3 },
  { id: 23, roll_no: 'bec1213', sub_id: 5 }
]

Subjects:
[
  { sub_id: 2, sub_name: 'Physics' },
  { sub_id: 3, sub_name: 'Chemistry' },
  { sub_id: 4, sub_name: 'Biology' },
  { sub_id: 1, sub_name: 'Maths' },
  { sub_id: 5, sub_name: 'Diff equations' }
]
```

**After Recursive Save:**

```text
Students:
[
  { id: 101, roll_no: 'ROLL001', sub_id: 1 },
  { id: 102, roll_no: 'ROLL002', sub_id: 2 },
  { id: 103, roll_no: 'ROLL003', sub_id: 3 },
  { id: 23, roll_no: 'bec1213', sub_id: 5 },
  { id: 32, roll_no: 'bdfdsa', sub_id: 6 }
]

Subjects:
[
  { sub_id: 2, sub_name: 'Physics' },
  { sub_id: 3, sub_name: 'Chemistry' },
  { sub_id: 4, sub_name: 'Biology' },
  { sub_id: 1, sub_name: 'Maths' },
  { sub_id: 5, sub_name: 'Diff equations' },
  { sub_id: 6, sub_name: 'Differential Equations' }
]
```

**After Recursive Delete:**

```text
Students:
[
  { id: 101, roll_no: 'ROLL001', sub_id: 1 },
  { id: 102, roll_no: 'ROLL002', sub_id: 2 },
  { id: 103, roll_no: 'ROLL003', sub_id: 3 },
  { id: 23, roll_no: 'bec1213', sub_id: 5 }
]

Subjects:
[
  { sub_id: 2, sub_name: 'Physics' },
  { sub_id: 3, sub_name: 'Chemistry' },
  { sub_id: 4, sub_name: 'Biology' },
  { sub_id: 1, sub_name: 'Maths' },
  { sub_id: 5, sub_name: 'Diff equations' }
]
```

---

## 🧠 Caching and Reference Equality

- **Caching:** The ORM provides an optional `entityMap` (Map) to cache instances of models. This ensures that when you query for the same object multiple times, you get the **same reference** instead of creating a new object.
- **Reference Equality:** With caching enabled, `Subject.find({ sub_id: 6 }) === sub` returns `true`. This is useful for comparing objects and maintaining object relationships correctly.
- **Optional:** If you don't want caching, simply do not override `entityMap` in your class.

---

## 🔧 Notes

- Recursive `save` and `delete` handle nested objects defined in `foreignKey`.
- Primary keys are required for both saving and deleting objects.
- `getInstance` allows converting raw SQL rows into fully functional model instances.
- Execute raw SQL directly when needed for complex queries or operations.

---

Enjoy using **pg-orm**! 🚀
