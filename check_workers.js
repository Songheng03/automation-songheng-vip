const Database = require("better-sqlite3");
const db = new Database(process.env.HOME + "/.automaton/state.db");
const tasks = db.prepare("SELECT id, goal_id, title, status, assigned_to FROM task_graph ORDER BY id").all();
console.log("task_graph:", JSON.stringify(tasks, null, 2));
const goals = db.prepare("SELECT id, title, status FROM goals").all();
console.log("goals:", JSON.stringify(goals, null, 2));
const orch = db.prepare("SELECT value FROM kv WHERE key = ?").get("orchestrator.state");
console.log("orchestrator.state:", orch?.value);
db.close();
