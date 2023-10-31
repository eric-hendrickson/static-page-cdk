// @ts-ignore
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
const ses = new SESClient({ region: "us-west-2" });

export const handler = async(event: any) => {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const headers = {
        "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
    };

    try {
        const eventBody = JSON.parse(event.body);

        const name = eventBody["name"];
        const email = eventBody["email"];
        const message = eventBody["message"];
        
        let badRequest = false;
        let noName = false;
        let noEmail = false;
        let badEmailFormat = false;
        let noMessage = false;
        
        if (!name || typeof name !== "string") {
            noName = true;
            badRequest = true;
        }
        
        if (!email || typeof email !== "string") {
            noEmail = true;
            badRequest = true;
        } else {
            if (!email.match(emailRegex)) {
                badEmailFormat = true;
                badRequest = true;
            }
        }
        
        if (!message || typeof message !== "string") {
            noMessage = true;
            badRequest = true;
        }
        
        if (badRequest) {
            const errorMessageArray = [];
            if (noName) {
                errorMessageArray.push('value "name" is not present or is invalid');
            }
            if (noEmail) {
                errorMessageArray.push('value "email" is not present or is invalid');
            }
            if (badEmailFormat) {
                errorMessageArray.push('value "email" is improperly formatted');
            }
            if (noMessage) {
                errorMessageArray.push('value "message" is not present or is invalid');
            }
            const errorMessage = errorMessageArray.join("; ");
            // @ts-ignore
            throw new Error(errorMessage, { cause: "badRequestBody" });
        }
        
        const data = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
             <html lang="en">
                 <head>
                     <meta charset="utf-8">
                     <title>The HTML5 Herald</title>
                     <meta name="description" content="The HTML5 Herald">
                     <meta name="author" content="SitePoint">
                     <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />
                     <link rel="stylesheet" href="css/styles.css?v=1.0">
                 </head>
                 <body>
                     <div class="img-container" style="display: flex;justify-content: center;align-items: center;border-radius: 5px;overflow: hidden; font-family: 'helvetica', 'ui-sans';">
                     </div>
                     <div class="container" style="margin-left: 20px;margin-right: 20px;">
                     <h3>You've got a new email from ${name}. Their email is:️ ${email} </h3>
                     <div style="font-size: 16px;">
                         <p><b>Message:</b></p>
                         <p>${message}</p>
                         <br>
                     </div>
                 </body>
             </html>`;
        
        const command = new SendEmailCommand({
            Destination: {
              ToAddresses: [process.env.SES_EMAIL_ADDRESS],
            },
            Message: {
              Body: {
                Html: { Data: data },
              },
        
              Subject: { Data: "New Message from your Portfolio Page" },
            },
            Source: process.env.SES_EMAIL_ADDRESS,
          });
    
    
        const sesResponse = await ses.send(command);
        if (sesResponse["$metadata"].httpStatusCode === 200) {
            const response = {
                statusCode: 200,
                headers,
                body: "Email has been successfully sent.",
            };
            return response;
        } else {
            throw Error("Email was not sent.")
        }
    }
    catch(error) {
        console.log(error);
        // @ts-ignore
        if (error.cause === 'badRequestBody') {
            const response = {
                statusCode: 400,
                headers,
                // @ts-ignore
                body: `Bad request: ${error.message}`,
            };
            return response;
        } else {
            const response = {
                statusCode: 500,
                headers,
                body: "Email could not be sent at this time. Please try again later.",
            };
            return response;
        }
    }
};
