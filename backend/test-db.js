require('dotenv').config();
const { Client } = require('pg');
const { Client: SSHClient } = require('ssh2');

async function testConnection(sshConfig, pgConfig, queryText) {
  const ssh = new SSHClient();

  return new Promise((resolve, reject) => {
    ssh.on('ready', () => {
      console.log(`[SSH] Միացումն իրականացվեց: ${sshConfig.username}@${sshConfig.host}`);

      ssh.forwardOut(
        '127.0.0.1', 12345, // Source IP and port (dummy)
        pgConfig.host, pgConfig.port, // Dest IP and port (Postgres)
        (err, stream) => {
          if (err) {
            ssh.end();
            return reject(`SSH Թունելի սխալ: ${err.message}`);
          }

          const pgClient = new Client({
            user: pgConfig.user,
            password: pgConfig.password,
            database: pgConfig.database,
            stream: stream // IMPORTANT: Using the SSH stream directly
          });

          pgClient.connect(err => {
            if (err) {
              ssh.end();
              return reject(`PostgreSQL Միացման սխալ: ${err.message}`);
            }

            console.log(`[DB] Բազային հաջողությամբ միացված է: ${pgConfig.database}`);

            if (queryText) {
              pgClient.query(queryText, (qErr, res) => {
                pgClient.end();
                ssh.end();
                
                if (qErr) {
                  return reject(`Հարցման սխալ: ${qErr.message}`);
                }
                
                console.log(`[DB] Հարցումը հաջողությամբ ավարտվեց: Վերադարձվեց ${res.rowCount} տող`);
                resolve(res.rows);
              });
            } else {
              pgClient.end();
              ssh.end();
              resolve('OK');
            }
          });
        }
      );
    }).on('error', (err) => {
      reject(`SSH Սխալ: ${err.message}`);
    }).connect({
      host: sshConfig.host,
      port: sshConfig.port || 22,
      username: sshConfig.username,
      password: sshConfig.password
    });
  });
}

// Հարցում առաջին բազային
const query1 = `
  SELECT product_name, SUM(sold_count) AS total_sold_count
  FROM public.vw_sales_report
  WHERE delivery_date >= '2026-03-01' AND delivery_date < '2026-04-01'
    AND product_id IN (385, 386)
  GROUP BY product_name;
`;

async function runTests() {
  console.log("=== Թեստավորում ենք առաջին միացումը (Sales Report) ===");
  try {
    const res1 = await testConnection(
      { host: process.env.SSH_HOST_1, username: process.env.SSH_USER_1, password: process.env.SSH_PASS_1 },
      { host: process.env.DB_HOST_1, port: process.env.DB_PORT_1, user: process.env.DB_USER_1, password: process.env.DB_PASS_1, database: process.env.DB_NAME_1 || 'postgres' },
      query1
    );
    console.log(res1);
  } catch (err) {
    console.error(err);
  }

  console.log("\\n=== Թեստավորում ենք երկրորդ միացումը (QRBonus readonly) ===");
  try {
    const res2 = await testConnection(
      { host: process.env.SSH_HOST_2, username: process.env.SSH_USER_2, password: process.env.SSH_PASS_2 },
      { host: process.env.DB_HOST_2, port: process.env.DB_PORT_2, user: process.env.DB_USER_2, password: process.env.DB_PASS_2, database: process.env.DB_NAME_2 },
      "SELECT current_database();"
    );
    console.log(res2);
  } catch (err) {
    console.error(err);
  }
}

runTests();
