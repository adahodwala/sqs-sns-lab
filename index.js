// Load the AWS SDK for Node.js
var AWS = require('aws-sdk');

/**
 * Don't hard-code your credentials!
 * Create an IAM role for your EC2 instance instead.
 */

// Set your region
AWS.config.region = 'us-east-1';

var sqs = new AWS.SQS();
var queueUrl = '';

//Create an SQS Queue
var params = {
    QueueName: 'najam-lab',
    /* required */
    Attributes: {
        ReceiveMessageWaitTimeSeconds: '20',
        VisibilityTimeout: '60'
    }
};

sqs.createQueue(params, function(err, data) {
    if (err) {
        // an error occurred
        console.log(err, err.stack);
    }
    else {
        // successful response
        console.log('Successfully created SQS queue URL ' + data.QueueUrl);
        queueUrl = data.QueueUrl;
        waitingSQS = false;
        //createMessages(data.QueueUrl);
        createSNSMessages();
    }
});

// Create 50 SQS messages
async function createMessages0(queueUrl) {
    var messages = [];
    for (var a = 0; a < 50; a++) {
        messages[a] = 'This is the content for message ' + a + '.';
    }
    // Asynchronously deliver messages to SQS queue
    for (const item of messages) {
        console.log('Sending message: ' + item);
        params = {
            MessageBody: item, // required //
            QueueUrl: queueUrl // required //
        };
        await sqs.sendMessage(params, function(err, data) { // Wait until callback
            if (err) console.log(err, err.stack); // an error occurred
            else console.log(data); // successful response
        });
    }
}

// Create 50 SQS messages
async function createMessages(queueUrl) {
    var messages = [];
    for (var a = 0; a < 5; a++) {
        messages[a] = [];
        for (var b = 0; b < 10; b++) {
            messages[a][b] = 'This is the content for message ' + (a * 10 + b) + '.';
        }
    }

    // Asynchronously deliver messages to SQS queue
    for (const item of messages) {
        console.log('Sending message: ' + item);
        params = {
            Entries: [],
            /* required */
            QueueUrl: queueUrl,
            /* required */
        };
        for (var b = 0; b < 10; b++) {
            params.Entries[b] = {
                MessageBody: item[b],
                Id: 'Message' + (a * 10 + b)
            };
        }
        a++;
        await sqs.sendMessageBatch(params, function(err, data) { // Wait until callback
            if (err) console.log(err, err.stack); // an error occurred
            else console.log(data); // successful response
        });
    }
}


// Poll queue for messages then process and delete
var waitingSQS = false;
var queueCounter = 0;

setInterval(function() {
    if (!waitingSQS) { // Still busy with previous request
        if (queueCounter <= 0) {
            receiveMessages();
        }
        else --queueCounter; // Reduce queue counter
    }
}, 1000);

// Create an SNS messages
var sns = new AWS.SNS();

function createSNSMessages() {
    var message = 'This is a message from Amazon SNS';
    console.log('Sending messages: ' + message);
    sns.publish({
        Message: message,
        TargetArn: 'arn:aws:sns:us-east-1:814422819054:najam-lab'
    }, function(err, data) {
        if (err) {
            console.log(err.stack);
        }
        else {
            console.log('Message sent by SNS: ' + data);
        }
    });
}

// Receive messages from queue
function receiveMessages() {
    var params = {
        QueueUrl: queueUrl,
        /* required */
        MaxNumberOfMessages: 10,
        VisibilityTimeout: 60,
        WaitTimeSeconds: 20 // Wait for messages to arrive
    };
    waitingSQS = true;
    sqs.receiveMessage(params, function(err, data) {
        if (err) {
            waitingSQS = false;
            console.log(err, err.stack); // an error occurred
        }
        else {
            waitingSQS = false;
            if ((typeof data.Messages !== 'undefined') && (data.Messages.length !== 0)) {
                console.log('Received ' + data.Messages.length +
                    ' messages from SQS queue.'); // successful response
                processMessages(data.Messages);
            }
            else {
                queueCounter = 60; // Queue empty back of for 60s
                console.log('SQS queue empty, waiting for ' + queueCounter + 's.');
            }
        }
    });
}

// Process and delete messages from queue
async function processMessages(messagesSQS) {
    for (const item of messagesSQS) {
        console.log('Processing message: ' + item.Body); // Do something with the message
        var params = {
            QueueUrl: queueUrl,
            /* required */
            ReceiptHandle: item.ReceiptHandle /* required */
        }
        await sqs.deleteMessage(params, function(err, data) { // Wait until callback
            if (err) console.log(err, err.stack); // an error occurred
            else {
                console.log('Deleted message RequestId: ' +
                    JSON.stringify(data.ResponseMetadata.RequestId)); // successful response
            }
        })
    }
}
