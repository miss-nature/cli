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

