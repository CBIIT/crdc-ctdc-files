const nodeFetch = require("node-fetch");
const mysql = require('mysql');
const config = require('../config.js');

const connection = mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_database,
    insecureAuth : false
});



async function getDCFTokenFromDatabase(req,res) {
   
     connection.getConnection(async function (err, currentConnection) {
        const sessionID = getSessionIDFromCookie(req, res);
        let output = -1;
        if (err) {
            console.log( "Could not establish a connection to the session database, see logs for details");
        }
        else if (sessionID !== null){
            connection.query("select * from sessions where session_id=?", sessionID, (err, rows) => {
                let response;
                if (err){
                    console.log("An error occurred while querying the database, see logs for details");
                }
                else if (!rows || !rows[0] || !rows[0].){
                    console.log("Session expires");
                }
                else{
                    output = rows[0].data.token;
                }
            });
        }
        else {
           console.log("An internal server error occurred, please contact the administrators");
        }
        currentConnection.release();
        return output;
    });
}


async function dcfFile(file_id, accessToken) {

    const url = config.DCF_File_URL+"/"+file_id
    const result = await nodeFetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ` + accessToken
        }
    });
    return result.json();
}


module.exports = async function (file_id,req,res) {
    const token = getDCFTokenFromDatabase(req,res);
    if(token == -1){
        return null;
    }else{
      return dcfFile(file_id);
    }
}
