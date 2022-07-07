import tl = require('azure-pipelines-task-lib/task');
import { time } from 'console';
const axios = require('axios').default;
const AWS = require('aws-sdk');
// tl.setResult(tl.TaskResult.Failed, 'Bad input was given');

const organizationName: string | undefined = tl.getInput('organizationName', true);
const projectName: string | undefined = tl.getInput('projectName', true);
const patToken: string | undefined = tl.getInput('patToken', true);
const buildNumber: string | undefined = tl.getInput('buildNumber', false);
const tableName: string | undefined = tl.getInput('tableName', true);
const awsAcces = tl.getEndpointAuthorization("provider", true);
const publicKey: string | undefined = tl.getInput("awsPublicKey", true);
const secretKey: string | undefined = tl.getInput("awsSecretKey", true);
/* {
      "Terraform": {
        "SS": [
          "Error : ieufnnvkzc",
          "Error : oizejfuizfnsz"
        ]
      }
    } */
let result = new Map<string , {[key : string] : Array<string>}>();
let log: Array<string> = [];
const regexPattern: RegExp = /Error(:).*/gmi
const taskNamePattern: RegExp = /Task.*/gm

const awsConfig = {
    "region": "eu-west-1",
    "endpoint": "http://dynamodb.eu-west-1.amazonaws.com",
    "accesKeyId": `${publicKey}`,
    "secretAccesKey": `${secretKey}`
}
AWS.config.update(awsConfig);

const docClient = new AWS.DynamoDB.DocumentClient();
const dbDynamo = new AWS.DynamoDB();
async function run() {

    try {

        await axios({
            method: 'get',
            url: `https://dev.azure.com/${organizationName}/${projectName}/_apis/build/builds/`,
            responseType: 'application/json',
            headers: {
                'Authorization': `Basic ${patToken}`,
            }
        })
            .then(async function (response: any) {

                const buildList = response.data.value
                let requestedBuild: number = 0
                if (buildNumber === "") {
                    requestedBuild = buildList[0].id
                } else {
                    const requestedByBuildNumber = buildList.filter((build: any) => build.buildNumber === buildNumber);
                    requestedBuild = requestedByBuildNumber[0].id
                }

                try {
                    await axios({
                        method: 'get',
                        url: `https://dev.azure.com/${organizationName}/${projectName}/_apis/build/builds/${requestedBuild}/logs`,
                        responseType: 'application/json',
                        headers: {
                            'Authorization': `Basic ${patToken}`,
                        }
                    })
                        .then(async function (response: any) {
                            // handle success
                            const foundLogs: Array<any> = response.data.value;

                            for (let i: any = 0; i < foundLogs.length; i++) {
                                let foundStrings: Array<string> = [""]
                                let foundTaskName: string = "None"
                                try {
                                    await axios({
                                        method: 'get',
                                        url: foundLogs[i].url,
                                        responseType: 'text/plain',
                                        headers: {
                                            'Authorization': `Basic ${patToken}`,
                                        }
                                    })
                                        .then(function (response: any) {
                                            // handle success
                                            log = response.data.value;



                                            log.forEach(element => {
                                                if (taskNamePattern.test(element)) {
                                                    const foundFullTask = element.match(taskNamePattern);

                                                    if (foundFullTask?.length !== 0) {
                                                        foundFullTask?.forEach((task) => {
                                                            foundTaskName = task;
                                                        })
                                                    }
                                                }
                                                const foundMatches = element.match(regexPattern)
                                                if (foundMatches?.length !== 0) {
                                                    foundMatches?.forEach(match => {
                                                        if (!foundStrings.includes(match)) {
                                                            foundStrings.push(match)
                                                        }
                                                    })
                                                } 
                                            })
                                            result.set(foundTaskName , {"SS" : foundStrings});

                                        }).then()



                                }
                                catch (err) {
                                    tl.setResult(tl.TaskResult.Failed, err.message);
                                }

                            }

                        })
                        .catch(function (error: any) {
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
                    const currentYear = timestamp.getFullYear()
                    const currentMonth = timestamp.getMonth()
                    const currentDay = timestamp.getDay()
                    const currentHour = timestamp.getHours()
                    const currentMinute = timestamp.getMinutes()
                    const dateString = `${currentYear}-${currentMonth}-${currentDay}-${currentHour}-${currentMinute}`
                    console.log(dateString);
                    const params = {
                        TableName: `${tableName}`,
                        Item: {
                            logId: { "S": "20220520.90" },
                            logDateAndTime: { "S": dateString.toString() },
                            createdBy: { "S": "Lander Marien" },
                            buildLogs: { "M": jsonResult }
                        }
                    }
                    dbDynamo.putItem(params, function (err: any, data: any) {
                        if (err) {
                            console.log("stage-thomas-more-log-data::save::error - " + JSON.stringify(err, null, 2))
                        } else {
                            console.log("stage-thomas-more-log-data::save::succes")
                        }
                    })

                }
                catch (err) {
                    tl.setResult(tl.TaskResult.Failed, err.message);
                }
            })


    } catch (err) {
        tl.setResult(tl.TaskResult.Failed, err.message);
    }

}


run();
