import { SESv2Client, ListSuppressedDestinationsCommand } from "@aws-sdk/client-sesv2";
import * as  fs  from 'fs';

const pageSize = process.env.PAGE_SIZE || 1000;

// Set up AWS SDK clients with credentials and region
const client = new SESv2Client({
  region: process.env.AWS_REGION || "us-east-1",
});

const getSuppressedEmailAddresses = async () => {
    try {

      let suppressedEmailAddresses = [];
      let params = {
        PageSize: pageSize,
      };
      do {
        console.log("fetching page")

        const data = await client.send(new ListSuppressedDestinationsCommand(params));

        if (data.SuppressedDestinationSummaries) {
          data.SuppressedDestinationSummaries.map((summary) => ({
            Email: summary.EmailAddress,
            Reason: summary.Reason,
            LastUpdateTime: summary.LastUpdateTime,
          }));
        }
        if(data.NextToken) {
          params.NextToken = data.NextToken;
          console.log("next token exists, sleeping")
          await sleep(1500);
        } else {
          params.NextToken = undefined
        }

      } while (params.NextToken);

      return suppressedEmailAddresses;
    } catch (error) {
      console.error(error);
      throw error;
    }
};

// Use the function
getSuppressedEmailAddresses()
  .then((suppressedEmailAddresses) => {
    console.log("finished fetching Email Addresses:", suppressedEmailAddresses.length);
    const csvData = convertArrayToCSV(suppressedEmailAddresses);
    writeToFile('suppressedEmailAddresses.csv', csvData);
  })
  .catch((error) => {
    console.error("Error:", error);
  });


function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function convertArrayToCSV(array) {
  const header = ["Email", "Reason", "LastUpdateTime"];
  const csv = [
    header.join(','),
    ...array.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','))
  ];
  return csv.join('\r\n');
}

function replacer(key, value) {
  return value === null ? '' : value
}

// Write CSV to a file
function writeToFile(fileName, data) {
  fs.writeFile(fileName, data, 'utf8', function (err) {
    if (err) {
      console.log('Some error occurred - file either not saved or corrupted file saved.');
    } else{
      console.log('It\'s saved!');
    }
  });
}
