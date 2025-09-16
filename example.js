import { Model, Database } from "./index.js";

const cred = {
  user: "postgres", // your DB username
  host: "localhost", // DB host
  database: "ORMDB", // database name
  password: "password", // your DB password
  port: 5432 // default Postgres port
};

const db = new Database(cred);
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

const sub = new Subject();
sub.id = 6;
sub.name = "Differe equations";
const stud = new Student();
stud.id = 32;
stud.rollNo = "bdfdsa";
stud.sub1 = sub;

let resStud = await db.query("select * from students");
let resSub = await db.query("select * from subjects");

console.log(`initial db`);
console.log(resStud.rows);
console.log(resSub.rows);

await stud.save(true);
resStud = await db.query("select * from students");
resSub = await db.query("select * from subjects");

console.log(`after save`);
console.log(resStud.rows);
console.log(resSub.rows);

const sub1 = await Subject.find({ sub_id: 6 });
console.log(`sub=== sub1 ${sub1 === sub}`);

await stud.delete(true);

resStud = await db.query("select * from students");
resSub = await db.query("select * from subjects");

console.log(`after delete`);
console.log(resStud.rows);
console.log(resSub.rows);
