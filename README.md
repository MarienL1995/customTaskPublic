# Azure Devops Custom Extension : Get build logs and publish to DynamoDB
This is a azure devops pipeline extension(task) made for my internship at Ordina.


# Concept

This extension fetches build logs from a speciefied build number from within azure devops or the latest build if no builnumber is provided.
This is possible by using the azure devops provided API calls. 
See following link for more info about the API : https://docs.microsoft.com/en-us/rest/api/azure/devops/build/builds?view=azure-devops-rest-6.0

Three seperate API calls are made:
 - One to fetch all the build from within an organization project
 - One to fetch the desired build by buildnumber or the lastest build by default
 - One to fetch all the build logs associated with the specified build

Because there are no specific identifiers to tell which logs belongs to which task every log from that build gets read.
For every log the task name is stored together with corresponding task error messages if any are present.

Once all tasks and error messages have been found a request is send to the AWS DynamoDB.

# Usage

In order to test this extension locally please make sure Node.js is installed on your machine and following ENV variables are configured:

 - INPUT_ORGANIZATIONNAME="your_organization_name"
 - INPUT_PROJECTNAME="your_project_name"
 - INPUT_PATTOKEN="your_pat_token_to_base64"
 - INPUT_BUILDNUMBER="your_build_number" // Not required if you just want the logs of the latest build
 - INPUT_TABLENAME="your_dynamodb_table_name"
 - INPUT_PUBLICKEY="your_aws_public_id_key"
 - INPUT_SECRETKEY="your_aws_secret_key"

DISCLAIMER : A PAT token can be generated using following guide but must also be converted to a base64 string in order to be used.

https://docs.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops&tabs=Windows

Now that everything is configured open your favorite cli, navigate inside the buildAndReleaseTask directory and type in following commands

 - tsc // to compile typescript code to javascript
 - node index.js // to launch a node.js project from the index.js file

