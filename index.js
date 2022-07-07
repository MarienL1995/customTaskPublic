"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const axios = require('axios').default;
const AWS = require('aws-sdk');
// tl.setResult(tl.TaskResult.Failed, 'Bad input was given');
const organizationName = tl.getInput('organizationName', true);
const projectName = tl.getInput('projectName', true);
const patToken = tl.getInput('patToken', true);
const buildNumber = tl.getInput('buildNumber', false);
const tableName = tl.getInput('tableName', true);
const awsAcces = tl.getEndpointAuthorization("provider", true);
const publicKey = tl.getInput("awsPublicKey", true);
const secretKey = tl.getInput("awsSecretKey", true);
/* {
      "Terraform": {
        "SS": [
          "Error : ieufnnvkzc",
          "Error : oizejfuizfnsz"
        ]
      }
    } */
let result = new Map();
let log = [];
const regexPattern = /Error(:).*/gmi;
const taskNamePattern = /Task.*/gm;
const awsConfig = {
    "region": "eu-west-1",
    "endpoint": "http://dynamodb.eu-west-1.amazonaws.com",
    "accesKeyId": `${publicKey}`,
    "secretAccesKey": `${secretKey}`
};
AWS.config.update(awsConfig);
const docClient = new AWS.DynamoDB.DocumentClient();
const dbDynamo = new AWS.DynamoDB();
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield axios({
                method: 'get',
                url: `https://dev.azure.com/${organizationName}/${projectName}/_apis/build/builds/`,
                responseType: 'application/json',
                headers: {
                    'Authorization': `Basic ${patToken}`,
                }
            })
                .then(function (response) {
                return __awaiter(this, void 0, void 0, function* () {
                    const buildList = response.data.value;
                    let requestedBuild = 0;
                    if (buildNumber === "") {
                        requestedBuild = buildList[0].id;
                    }
                    else {
                        const requestedByBuildNumber = buildList.filter((build) => build.buildNumber === buildNumber);
                        requestedBuild = requestedByBuildNumber[0].id;
                    }
                    try {
                        yield axios({
                            method: 'get',
                            url: `https://dev.azure.com/${organizationName}/${projectName}/_apis/build/builds/${requestedBuild}/logs`,
                            responseType: 'application/json',
                            headers: {
                                'Authorization': `Basic ${patToken}`,
                            }
                        })
                            .then(function (response) {
                            return __awaiter(this, void 0, void 0, function* () {
                                // handle success
                                const foundLogs = response.data.value;
                                for (let i = 0; i < foundLogs.length; i++) {
                                    let foundStrings = [""];
                                    let foundTaskName = "None";
                                    try {
                                        yield axios({
                                            method: 'get',
                                            url: foundLogs[i].url,
                                            responseType: 'text/plain',
                                            headers: {
                                                'Authorization': `Basic ${patToken}`,
                                            }
                                        })
                                            .then(function (response) {
                                            // handle success
                                            log = response.data.value;
                                            log.forEach(element => {
                                                if (taskNamePattern.test(element)) {
                                                    const foundFullTask = element.match(taskNamePattern);
                                                    if ((foundFullTask === null || foundFullTask === void 0 ? void 0 : foundFullTask.length) !== 0) {
                                                        foundFullTask === null || foundFullTask === void 0 ? void 0 : foundFullTask.forEach((task) => {
                                                            foundTaskName = task;
                                                        });
                                                    }
                                                }
                                                const foundMatches = element.match(regexPattern);
                                                if ((foundMatches === null || foundMatches === void 0 ? void 0 : foundMatches.length) !== 0) {
                                                    foundMatches === null || foundMatches === void 0 ? void 0 : foundMatches.forEach(match => {
                                                        if (!foundStrings.includes(match)) {
                                                            foundStrings.push(match);
                                                        }
                                                    });
                                                }
                                            });
                                            result.set(foundTaskName, { "SS": foundStrings });
                                        }).then();
                                    }
                                    catch (err) {
                                        tl.setResult(tl.TaskResult.Failed, err.message);
                                    }
                                }
                            });
                        })
                            .catch(function (error) {
                            // handle error
                            console.log(error);
                        })
                            .then(function () {
                            // always executed
                        });
                        console.log(result);
                        const jsonResult = Object.fromEntries(result);
                        console.log(jsonResult);
                        const timestamp = new Date();
                        const currentYear = timestamp.getFullYear();
                        const currentMonth = timestamp.getMonth();
                        const currentDay = timestamp.getDay();
                        const currentHour = timestamp.getHours();
                        const currentMinute = timestamp.getMinutes();
                        const dateString = `${currentYear}-${currentMonth}-${currentDay}-${currentHour}-${currentMinute}`;
                        console.log(dateString);
                        const params = {
                            TableName: `${tableName}`,
                            Item: {
                                logId: { "S": "20220520.90" },
                                logDateAndTime: { "S": dateString.toString() },
                                createdBy: { "S": "Lander Marien" },
                                buildLogs: { "M": jsonResult }
                            }
                        };
                        dbDynamo.putItem(params, function (err, data) {
                            if (err) {
                                console.log("stage-thomas-more-log-data::save::error - " + JSON.stringify(err, null, 2));
                            }
                            else {
                                console.log("stage-thomas-more-log-data::save::succes");
                            }
                        });
                    }
                    catch (err) {
                        tl.setResult(tl.TaskResult.Failed, err.message);
                    }
                });
            });
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
run();
