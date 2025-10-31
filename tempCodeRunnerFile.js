// MongoDB Playground
// Use Ctrl+Space inside a snippet or a string literal to trigger completions.

// The current database to use.
use("chai_code_db");

db.getCollection("users").insertMany([
  { name: "Alice", age: 28, city: "New York" },
  { name: "Bob", age: 34, city: "San Francisco" },
  { name: "Charlie", age: 22, city: "Los Angeles" },
  { name: "Diana", age: 30, city: "Chicago" }
]);

