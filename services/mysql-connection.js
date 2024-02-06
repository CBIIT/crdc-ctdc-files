const mysql = require('mysql');
const config = require('../config.js');

const connection = mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_database,
    insecureAuth : false
});

const getToken = (req, res) => {

     connection.getConnection(async function (err, currentConnection) {
        const sessionID = getSessionIDFromCookie(req, res);
        if (err) {
            res.json({ error: "Could not establish a connection to the session database, see logs for details"});
            return;
        }
        else if (sessionID !== null){
            connection.query("select * from sessions where session_id=?", sessionID, (err, rows) => {
                let response;
                if (err){
                    console.log(err);
                    response = { error: "An error occurred while querying the database, see logs for details"};
                }
                else if (!rows || !rows[0] || !rows[0].){
                    response = { error: "Session expires"};
                }
                else{
                    let token = rows[0].data.token;
                    response = {token: token};
                }
                res.json(response);
            });
        }
        else {
            res.json({error: "An internal server error occurred, please contact the administrators"});
        }
        currentConnection.release();
    });
}

