const nodeFetch = require('node-fetch');
const mysql = require('mysql');
const config = require('../config.js');

const connection = mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_database,
    insecureAuth : false
});


function getSessionIDFromCookie(req, res){
    if (!req || !req.cookies || !req.cookies["connect.sid"]){
        return null;
    }
    else{
        return req.cookies["connect.sid"].match(':.*[.]')[0].slice(1,-1);
    }
}


async function getDCFTokenFromDatabase(req,res) {
        let currentConnection = null;
        try {
        const currentConnection = await new Promise((resolve, reject) => {
            connection.getConnection((err, connection) => {
                if (err) reject(err);
                else resolve(connection);
            });
        });

        // let sessionID = getSessionIDFromCookie(req, res);
        let sessionID = 1; // Example sessionID
        if (sessionID !== null) {
            const rows = await new Promise((resolve, reject) => {
                currentConnection.query("select * from sessions", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            if (!rows || !rows[0] || !rows[0].data) {
                console.log("Session expires");
                return -1; // or handle accordingly
            } else {
                const output = JSON.parse(rows[0].data).userInfo.tokens;
                return output;
            }
        } else {
            console.log("An internal server error occurred, please contact the administrators");
            return -1;
        }
        if (currentConnection) currentConnection.release();
    } catch (error) {
        console.log("Error: ", error.message);
        return -1;
    } finally {
         if (currentConnection) {
            currentConnection.release(); // Ensure connection is released
        }
        
    }
}

async function dcfFile(file_id, accessToken) {
    // Construct the URL using template literals for better readability
    const url = `${config.DCF_File_URL}/${file_id}`;
    
    try {
        // Perform the HTTP GET request using the Fetch API
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // Check if the response is successful (status in the range 200-299)
        if (!response.ok) {
            // Throw an error with response status if the fetch was not successful
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Parse the JSON response body and return it
        return await response.json();
    } catch (error) {
        // Handle errors that occurred during the fetch operation or JSON parsing
        console.error("Error fetching the DCF file:", error.message);
        throw error; // Rethrow the error if you want the caller to handle it
    }
}



module.exports = async function (file_id,req,res) {
    const token = await getDCFTokenFromDatabase(req,res);
    if(token == -1){
        return null;
    }else{
      return dcfFile(file_id, token);
    }
}
