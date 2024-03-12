#!/usr/bin/env node

import axios from "axios";
import { Command } from "commander";
import Configstore from "configstore";
import dotenv from "dotenv";
import faker from 'faker';
import fs from "fs";
import inquirer from "inquirer";
import mysql from 'mysql2/promise';
import path from 'path';
import shell from "shelljs";
const config = new Configstore("voxa");
dotenv.config();

const program = new Command();

program.version("1.0.0").description("A simple CLI application");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
});

program
    .command("init")
    .description("Initialize the CLI by setting up configuration")
    .option("-y, --yes", "Skip interactive prompts")
    .action(async (options) => {
        let headers = [];
        if (!options.yes) {
            const answers = await inquirer.prompt([
                {
                    type: "input",
                    name: "baseUrl",
                    message: "Enter the base URL:",
                    default: "http://localhost:3000/api",
                },
                {
                    type: "confirm",
                    name: "customHeaders",
                    message: "Do you want to add custom headers?",
                    default: false,
                },
                {
                    when: (response) => response.customHeaders,
                    type: "input",
                    name: "header",
                    message: "Enter a custom header (key:value):",
                },
                {
                    type: "confirm",
                    name: "customApiKey",
                    message: "Do you want to add an API Key?",
                    default: false,
                },
                {
                    when: (response) => response.customApiKey,
                    type: "input",
                    name: "apiKey",
                    message: "Enter an API Key: ",
                },
                {
                    type: "confirm",
                    name: "customMonitoring",
                    message: "Do you have a New Relic account for monitoring? ",
                    default: false,
                },
                {
                    when: (response) => response.customMonitoring,
                    type: "input",
                    name: "licenseKey",
                    message: "Enter License Key: ",
                },
                {
                    when: (response) => response.customMonitoring,
                    type: "input",
                    name: "appName",
                    message: "Enter App Name: ",
                }
        ]);

        config.set("baseUrl", answers.baseUrl);

            if (answers.apiKey) {
                config.set("apiKey", answers.apiKey);
            }

            if (answers.header) {
                headers.push(answers.header);
            }
        }
        else 
        {
            config.set("baseUrl", "http://localhost:3000/api");
        }
        config.set("headers", headers);
        fs.writeFileSync("voxa.config", JSON.stringify(config.all, null, 2));
        console.log("Initialization complete. Configuration saved to voxa.config.");
        process.exit(0);
    });

program
    .command("get <route>")
    .description("Send an HTTP GET request")
    .option("-b, --baseUrl <baseUrl>", "Specify the base URL")
    .action(async (route, options) => {
        const storedConfig = JSON.parse(
            fs.readFileSync("voxa.config", "utf-8")
        );
        const baseUrl =
            options.baseUrl ||
            storedConfig.baseUrl ||
            "http://localhost:3000/api";
        const targetUrl = baseUrl + route;
        try {
            const response = await axios.get(targetUrl);
            console.log("HTTP Status:", response.status);
            console.log(response.data);
            process.exit(0);
        } 
        catch (error) {
            console.error("Error:", error.message);

            if (error.response) 
            {
                console.log("HTTP Status:", error.response.status);
                console.log("Response Data:", error.response.data);
            }
            process.exit(1);
        }
    });

program
    .command("post <route>")
    .description("Make a POST request to the specified URL")
    .action(async (route, data) => {
        const voxaConfig = JSON.parse(fs.readFileSync("voxa.config", "utf8"));
        const baseUrl = voxaConfig.baseUrl;
        const headers = voxaConfig.headers || {};
        const targetUrl = baseUrl + route;

        try {
            const response = await axios.post(targetUrl, data, {
                headers,
            });
            console.log(response.data);
        } catch (error) {
            console.error("Error:", error.message);
        }
    });

program
    .command("setup")
    .description("setup development environments seamlessly")
    .action(async () => {
        const answer = await inquirer.prompt([
            {
                type: "list",
                name: "devEnv",
                message: "Select development environment",
                choices: [
                    { name: "MERN Project", value: "mern" },
                    { name: "Django", value: "django" },
                    { name: "Flask", value: "flask" },
                    { name: "Ruby on Rails", value: "ruby" },
                ],
            },
        ]);
        if (answer.devEnv === "mern") {
            // Backend setup
            shell.mkdir("-p", "./backend/src/controllers");
            shell.mkdir("-p", "./backend/src/models");
            shell.mkdir("-p", "./backend/src/routes");
            shell.touch("./backend/.gitignore");
            shell.touch("./backend/src/app.js");
            shell.touch("./backend/src/server.js");

            shell.cd("backend");
            shell.exec("npm init -y");
            shell.exec("npm install express mongoose cors");
            shell.cd("..");
            shell.mkdir("-p", "./frontend");
            shell.cd("frontend");
            shell.exec("npx create-react-app .");
            shell.cd("..");
        }
        if (answer.devEnv === "django") {
            const djangoSetup = await inquirer.prompt([
                {
                    type: "input",
                    name: "projectName",
                    message: "Enter project name: ",
                },
                {
                    type: "list",
                    name: "os",
                    message: "Select your operating system",
                    choices: [
                        { name: "Windows", value: "win" },
                        { name: "Linux", value: "linux" },
                        { name: "MacOs", value: "mac" },
                    ],
                },
            ]);
            if (djangoSetup.os === "win") {
                shell.exec("py -3 -m venv .venv");
                // shell.exec('Set-ExecutionPolicy RemoteSigned -Scope Process');
                // shell.exec('.venv/scripts/activate');
            } else if (djangoSetup.os === "linux") {
                shell.exec("sudo apt-get install python3-venv");
                shell.exec("python3 -m venv .venv");
                shell.exec("source .venv/bin/activate");
            } else if (djangoSetup.os === "mac") {
                shell.exec("python3 -m venv .venv");
                shell.exec("source .venv/bin/activate");
            }
            shell.exec("python -m pip install django");
            shell.exec(
                `django-admin startproject ${djangoSetup.projectName} .`
            );
            shell.exec("python manage.py migrate");
            shell.exec("python manage.py runserver");
        }
        if (answer.devEnv === "flask") {
            const flaskSetup = await inquirer.prompt([
                {
                    type: "list",
                    name: "os",
                    message: "Select your operating system",
                    choices: [
                        { name: "Windows", value: "win" },
                        { name: "Linux", value: "linux" },
                        { name: "MacOs", value: "mac" },
                    ],
                },
            ]);
            if (flaskSetup.os === "win") {
                shell.exec("py -3 -m venv .venv");
                // shell.exec('Set-ExecutionPolicy RemoteSigned -Scope Process');
                // shell.exec('.venv/scripts/activate');
            } else if (flaskSetup.os === "linux") {
                shell.exec("sudo apt-get install python3-venv");
                shell.exec("python3 -m venv .venv");
                shell.exec("source .venv/bin/activate");
            } else if (flaskSetup.os === "mac") {
                shell.exec("python3 -m venv .venv");
                shell.exec("source .venv/bin/activate");
            }
            shell.exec("pip install flask");
            shell.exec("touch app.py");
        }
        if (answer.devEnv === "ruby") {
            const rubySetup = await inquirer.prompt([
                {
                    type: "input",
                    name: "projectName",
                    message: "Enter project name: ",
                },
            ]);
            shell.exec("gem install rails");
            shell.exec(`rails new ${rubySetup.projectName}`);
            shell.cd(`${rubySetup.projectName}`);
            shell.exec("rails db:create");
            shell.exec("rails server");
        }
    });

program
    .command("monitor")
    .description("start real-time performance monitoring")
    .option("-u, --url <url>", "URL of the web application")
    .option(
        "-t, --tool <tool>",
        "performance monitoring tool (preferably NewRelic)"
    )
    .action((options) => {
        const { url, tool } = options;
        if (tool === "NewRelic") {
            newrelic.setLicenseKey(`${voxaConfig.licenseKey}`);
            newrelic.setAppName(`${voxaConfig.appName}`);
            const app = newrelic.startWebTransaction(url, () => {});
            app.end();
        } else {
            console.error("Unsupported performance monitoring tool");
        }
    });

program
    .command("create-story <title> <description>")
    .action(async (title, description) => {
        const queryOptions = { timeout: 15000 };
        const query =
            "INSERT INTO user_stories (title, description) VALUES (?, ?)";
        const [story] = await pool.query(
            query,
            [title, description],
            queryOptions
        );
        console.log("User story created successfully.");
    });

program
    .command("add-task <storyId> <title> <description>")
    .action(async (storyId, title, description) => {
        const queryOptions = { timeout: 15000 };
        const query =
            "INSERT INTO tasks (story_id, title, description) VALUES (?, ?, ?)";
        const [task] = await pool.query(
            query,
            [storyId, title, description],
            queryOptions
        );
        console.log("Task added successfully.");
    });

program.command("list-stories").action(async () => {
    const queryOptions = { timeout: 10000 };
    const query = "SELECT * FROM user_stories";
    const [stories] = await pool.query(query, queryOptions);
    console.table(stories.slice(0, -1));
    });

program.command("view-story <storyId>").action(async (storyId) => {
    const queryOptions = { timeout: 10000 };
    const query = "SELECT * FROM user_stories WHERE id = ?";
    const [story] = await pool.query(query, [storyId], queryOptions);
    console.table(story);
    });

program
    .command("assign-task <taskId> <assignee>")
    .action(async (taskId, assignee) => {
        const queryOptions = { timeout: 10000 };
        const query =
            "INSERT INTO task_assignments (task_id, assignee) VALUES (?, ?)";
        const [task] = await pool.query(
            query,
            [taskId, assignee],
            queryOptions
        );
        console.log("Task assigned successfully.");
    });

program
    .command("update-task-status <taskId> <status>")
    .action(async (taskId, status) => {
        const queryOptions = { timeout: 10000 };
        const query = "UPDATE tasks SET status = ? WHERE id = ?";
        const [task] = await pool.query(query, [status, taskId], queryOptions);
        console.log("Task status updated successfully.");
    });

program
    .command("update-task-progress <taskId> <progress>")
    .action(async (taskId, progress) => {
        const queryOptions = { timeout: 10000 };
        const query = "UPDATE tasks SET progress = ? WHERE id = ?";
        const [task] = await pool.query(
            query,
            [progress, taskId],
            queryOptions
        );
        console.log("Task progress updated successfully.");
    });

program.command("complete-task <taskId>").action(async (taskId) => {
    const queryOptions = { timeout: 10000 };
    const query = "DELETE FROM tasks WHERE id = ?";
    const [task] = await pool.query(query, [taskId], queryOptions);
    console.log("Task completed and removed from the list.");
    });

program.command("start-sprint <sprintName>").action(async (sprintName) => {
    const queryOptions = { timeout: 10000 };
    const query = "INSERT INTO sprints (name) VALUES (?)";
    const [sprint] = await pool.query(query, [sprintName], queryOptions);
    console.log("Sprint started successfully.");
    });

program
    .command("add-to-sprint <taskId> <sprintId>")
    .action(async (taskId, sprintId) => {
        const queryOptions = { timeout: 10000 };
        const query =
            "INSERT INTO sprint_tasks (sprint_id, task_id) VALUES (?, ?)";
        const [sprint] = await pool.query(
            query,
            [sprintId, taskId],
            queryOptions
        );
        console.log("Task added to the sprint.");
    });

program.command("end-sprint <sprintId>").action(async (sprintId) => {
    const queryOptions = { timeout: 10000 };
    const query = "UPDATE sprints SET end_date = CURRENT_DATE WHERE id = ?";
    const [sprint] = await pool.query(query, [sprintId], queryOptions);
    console.log("Sprint ended successfully.");
    });

program
    .command("comment <taskId> <user> <commentText>")
    .action(async (taskId, user, commentText) => {
        const queryOptions = { timeout: 10000 };
        const query =
            "INSERT INTO comments (task_id, user, comment_text) VALUES (?, ?, ?)";
        const [comment] = await pool.query(
            query,
            [taskId, user, commentText],
            queryOptions
        );
        console.log("Comment added successfully.");
    });

program
    .command("track-velocity <sprintId> <velocity>")
    .action(async (sprintId, velocity) => {
        const queryOptions = { timeout: 10000 };
        const query =
            "INSERT INTO velocity_tracking (sprint_id, velocity) VALUES (?, ?)";
        const [track_velocity] = await pool.query(
            query,
            [sprintId, velocity],
            queryOptions
        );
        console.log("Velocity tracked successfully.");
    });

program.command("dev-report").action(async () => {
    const queryOptions = { timeout: 15000 };

    const userStoriesQuery = "SELECT * FROM user_stories";
    const [userStories] = await pool.query(userStoriesQuery, queryOptions);

    const tasksQuery = "SELECT * FROM tasks";
    const [tasks] = await pool.query(tasksQuery, queryOptions);

    const sprintsQuery = "SELECT * FROM sprints";
    const [sprints] = await pool.query(sprintsQuery, queryOptions);

    const commentQuery = "SELECT * FROM sprints";
    const [comments] = await pool.query(commentQuery, queryOptions);

    console.log("User Stories:");
    console.table(userStories.slice(0, -1));

    console.log("\nTasks:");
    console.table(tasks.slice(0, -1));

    console.log("\nSprints:");
    console.table(sprints.slice(0, -1));

    console.log("\nComments:");
    console.table(comments.slice(0, -1));
    });

let dbStructure = {};

function generateMockData(structure, count) {
  const data = [];
  for (let i = 0; i < count; i++) {
    const row = {};
    Object.keys(structure).forEach(field => {
      switch (structure[field]) {
        case 'id':
          row[field] = i + 1;
          break;
        case 'name':
          row[field] = faker.name.findName();
          break;
        case 'email':
          row[field] = faker.internet.email();
          break;
        case 'phone':
          row[field] = faker.phone.phoneNumber();
          break;
        case 'address':
          row[field] = `${faker.address.streetAddress()}, ${faker.address.city()}, ${faker.address.stateAbbr()} ${faker.address.zipCode()}`;
          break;
        case 'price':
          row[field] = faker.commerce.price();
          break;
        case 'productId':
          row[field] = faker.datatype.number({ min: 1, max: count });
          break;
        case 'quantity':
          row[field] = faker.datatype.number({ min: 1, max: 10 });
          break;
        case 'boolean':
          row[field] = faker.datatype.boolean();
          break;
        case 'date':
          row[field] = faker.date.past().toISOString();
          break;
        case 'datetime':
          row[field] = faker.date.past().toISOString();
          break;
        case 'text':
          row[field] = faker.lorem.paragraph();
          break;
        case 'company':
          row[field] = faker.company.companyName();
          break;
        case 'job':
          row[field] = faker.name.jobTitle();
          break;
        case 'color':
          row[field] = faker.internet.color();
          break;
        default:
          row[field] = faker.datatype.string();
          break;
      }
    });
    data.push(row);
  }
  return data;
}

async function getDbStructure() {
    const dbName = await inquirer.prompt({
      type: 'input',
      name: 'name',
      message: 'Enter the temporary json file name:'
    });
  
    const fields = await inquirer.prompt({
      type: 'input',
      name: 'fields',
      message: 'Enter the database structure (name:type, separated by commas, types supported: id, name, email, phone, price, productId, quantity, boolean, date, text, company, job, color):'
    });
  
    const structure = {};
    const fieldTypes = fields.fields.split(',');
    fieldTypes.forEach(fieldType => {
      const [field, type] = fieldType.trim().split(':');
      structure[field] = type;
    });
  
    dbStructure[dbName.name] = structure;
  
    return dbName.name;
  }

program
  .command('seed <count>')
  .description('Seed a mock database')
  .action(async (count) => {
    const dbName = await getDbStructure();
    const mockData = generateMockData(dbStructure[dbName], parseInt(count));

    const filePath = path.join(`${dbName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(mockData, null, 2));

    console.log(`Mock data for ${dbName} (${count} records) saved to ${filePath}`);

    const file = `${dbName}.json`;
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.table(data);
  });

program.parse(process.argv);