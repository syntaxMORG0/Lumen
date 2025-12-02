import { styleText } from "node:util";
import * as readlineSync from "readline-sync";
import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import crypto from "crypto";
import http from "http";
import open from "open";
import { config } from "node:process";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

//high-level kernel data
//Userdata wil later be stored in a JSON file
let KernelData = {
  running: true,
  DisplayDebug: false,
  clearOnStart: true,
  logedIn: false,
  username: "", //leave blank
  author: {
    username: "syntaxMORG0",
    Repo: "Lumen",
  },
  temp: {
    autoE2E_API: "" //leave empty the key is automatically generated
  },
  config: {
    network: {
      type: "DHCP", //default
      ip: "",
      gateway: "",
      dns: "",
      subnetmask: "",
    }
  }
};

let gitCommitHash: string = "";

async function getLatestCommit() {
  try {
    const owner = KernelData.author.username;
    const repo = KernelData.author.Repo;

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`,
    );

    if (!response.ok) {
      return exit("0x00000", 0, `GitHub API error: ${response.status}`);
    }

    const commits = await response.json();
    const latestCommit = commits[0];

    gitCommitHash = latestCommit.sha.substring(0, 7);

    if (commits.length > 0) {
      return `\nCommit: ${gitCommitHash}\nAuthor: ${latestCommit.commit.author.name}\nDate: ${latestCommit.commit.author.date}\nMessage: ${latestCommit.commit.message}\n`;
    }
    return "No commits found";
  } catch (error) {
    return exit("0x00000", 0, `Error: ${error}`);
  }
}

function display(
  adress: string,
  content: string,
  format: string | undefined,
  color?: string | undefined,
) {
  if (adress) {
    if (content) {
      let FormatedText: string | undefined;
      let Color: string = "white";
      let Message: string = content;
      if (format) {
        switch (format) {
          case "0x0F000":
            FormatedText = undefined;
            break;
          case "0x1F000":
            FormatedText = "bold";
            break;
          case "0x2F000":
            FormatedText = "italic";
        }
      }
      if (color) {
        switch (color) {
          case "0x0F100":
            //color white
            Color = "white";
            break;
          case "0x0F200":
            //color red
            Color = "red";
            break;
          case "0x0F300":
            //color yellow
            Color = "yellow";
            break;
          case "0x0F400":
            //color green
            Color = "green";
            break;
          case "0x0F500":
            //color blue
            Color = "blue";
            break;
          case "0x0F600":
            //color magenta
            Color = "magenta";
            break;
          case "0x0F700":
            //color cyan
            Color = "cyan";
            break;
          case "0x0F800":
            //color black
            Color = "black";
            break;
          case "0x0F900":
            //color gray
            Color = "gray";
            break;
          case "0x0FA00":
            //color bright red
            Color = "redBright";
            break;
          case "0x0FB00":
            //color bright green
            Color = "greenBright";
            break;
          case "0x0FC00":
            //color bright yellow
            Color = "yellowBright";
            break;
          case "0x0FD00":
            //color bright blue
            Color = "blueBright";
            break;
          case "0x0FE00":
            //color bright magenta
            Color = "magentaBright";
            break;
          case "0x0FF00":
            //color bright cyan
            Color = "cyanBright";
            break;
        }
      }
      let styles = FormatedText ? [Color, FormatedText] : [Color];
      let formatedText = styleText(styles as any, Message);
      console.log(formatedText);
    } else {
      exit("0x00000", 0, "missing argument: content");
    }
  } else {
    exit("0x00000", 0, "missing argument: adress");
  }
  return;
}
function exit(adress: string, code?: number, reason?: string) {
  if (adress) {
    console.log("");
    switch (code) {
      case 0:
        //crashed
        KernelData.running = false;
        const stack = new Error().stack;
        const stackLines = stack?.split("\n").slice(2, 4).join("\n") || "";
        display("0x00000", memory["0x1E000"] + reason, "0x0F000", "0x0F200");
        if (stackLines) {
          display("0x00000", "Stack trace:", "0x0F000", "0x0F900");
          console.log(styleText("gray", stackLines));
        }
        process.exit(0);
      case 1:
        //sucsess
        KernelData.running = false;
        display("0x00000", memory["0x1E001"], "0x0F000", "0x0F700");
        process.exit(1);
      default:
        //undefined
        KernelData.running = false;
        break;
    }
  }
  console.log(styleText("gray", memory["0x1E002"] + memory["0xF0002"]));
  return;
}
function wrt(content: string) {
  return display("0x00000", content, "0x0F000", "0x0F100");
};
function ReadLn(adress?: string, prefix?: string | undefined) {
  if (KernelData.username != "") {
    return readlineSync.question(
      prefix
        ? prefix
        : styleText("green", memory["0xF0002"] + "  " + KernelData.username + "@lumen ~ ")
    );
  }
  else {
    return readlineSync.question(
      prefix ? prefix : styleText("green", "guest@lumen ~ "),
    );
  }
}

async function LumenEditor() {
  const src = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Lumen Editor</title>
        <style>
          body { margin: 0; padding: 20px; font-family: monospace; }
          #editor { 
            width: 100%; 
            height: 90vh; 
            border: 1px solid #ccc; 
            padding: 10px;
            outline: none;
          }
        </style>
      </head>
      <body>
        <h2>Lumen Editor</h2>
        <div id="editor" contenteditable="true">Start typing here...</div>
      </body>
    </html>
  `;
  
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(src);
  });
  
  server.listen(3000, async () => {
    display("0x00000", "Server running at http://localhost:3000", "0x0F000", "0x0F400");
    display("0x00000", "Opening browser... Press Ctrl+C to stop server", "0x0F000", "0x0F900");
    try {
      await open('http://localhost:3000');
    } catch (err) {
      const error = err as Error;
      display("0x00000", "Could not open browser automatically. Please visit http://localhost:3000", "0x0F000", "0x0F300");
    }
  });
  
  server.on('error', (err) => {
    display("0x00000", `Server error: ${err.message}`, "0x0F000", "0x0F200");
  });
}

async function CommandEngine(command: string) {
  if (command) {
    switch (command) {
      case memory["0xFF000"]["0xFF001"]:
        memory["0xFFD00"] = false;
        break;
      case command.startsWith(memory["0xFF000"]["0xFF002"]) && command:
        const echoText = command
          .substring(memory["0xFF000"]["0xFF002"].length)
          .trim();
        if (echoText) {
          display("0x00000", echoText, "0x0F000", "0x0F100");
        }
        break;
      case memory["0xFF000"]["0xFF003"]:
        display("0x00000", memory["0x1D6A0"], "0x0F000", "0x0F100");
        break;
      case memory["0xFF000"]["0xFF005"]: //clear
        console.clear();
        break;
      case command.startsWith(memory["0xFF000"]["0xFF006"]) && command: //status
        const subCommand = command
          .substring(memory["0xFF000"]["0xFF006"].length)
          .trim();
        if (subCommand === "-v") {
          display("0x00000", memory["0xFFE07"], "0x0F000", "0x0F700");
        } else if (subCommand === "-h") {
          display("0x00000", memory["0x1D6A0"], "0x0F000", "0x0F000");
        } else if (subCommand === "-u") {
          async function checkForUpdate() {
            const user = KernelData.author.username;
            const repo = KernelData.author.Repo;
            const url = `https://api.github.com/repos/${user}/${repo}/releases/latest`;
            try {
              const response = await fetch(url);
              if (!response.ok) {
                exit("0x00000", 0, "Http error while fetching latest release")
              }
              const latestRelease = await response.json();
              
              console.log("Latest Release:", latestRelease);
              return latestRelease;
            } catch (error) {
              exit("0x00000", 0, "Failed to fetch latest release:" + error);
            }
          }
          function buildAnswer(rel: any) {
            const answer = `Latest release: ${rel.name}\nVersion: ${rel.tag_name}\nDownload: ${rel.html_url}`;
            if (rel.name === undefined || rel.tag_name === undefined || rel.html_url === undefined) {
              display("0x00000", "No release created yet! or missing data", "0x0F000", "0x0F300");
            }
            else {
              display("0x00000", "\n" + answer + "\n", "0x0F000", "0x0F700");
            }
          }
          buildAnswer(checkForUpdate());      
        } else if (subCommand === "--ghlogin") {
          const token = readlineSync.question("Enter GitHub Personal Access Token: ", {
            hideEchoBack: true
          });
          if (!token) {
            display("0x00000", "No token provided!", "0x0F000", "0x0F200");
            break;
          }
          try {
            const response = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Lumen-CLI'
              }
            });
            if (!response.ok) {
              display("0x00000", "Failed to authenticate. Check your token.", "0x0F000", "0x0F200");
              break;
            }
            const userData = await response.json();
            const username = userData.login;
            
            // Save both username and token to data.json
            await writeFile('data.json', JSON.stringify({ username, token }, null, 2));
            
            KernelData.username = username;
            KernelData.logedIn = true;

            display("0x00000", `Successfully logged in as ${username}!`, "0x0F000", "0x0F400");
          } catch (err) {
            const error = err as Error;
            exit("0x00000", 0, "Error: " + error.message);
          }
        } else if (subCommand === "--ghlogout") {
          try {
            if (!KernelData.logedIn) {
              display("0x00000", "You are not logged in!", "0x0F000", "0x0F300");
              break;
            }
            const previousUsername = KernelData.username;
            await writeFile('data.json', JSON.stringify({}, null, 2));
            
            KernelData.username = "";
            KernelData.logedIn = false;

            display("0x00000", `Logged out from ${previousUsername}`, "0x0F000", "0x0F400");
          } catch (err) {
            const error = err as Error;
            exit("0x00000", 0, "Error during logout: " + error.message);
          }
        }
        else {
          display("0x00000", "missing arguments!", "0x0F000", "0x0F200");
        }
        break;
      case memory["0xFF000"]["0xFF007"]:
        await LumenEditor();
        break;
      case command.startsWith(memory["0xFF000"]["0xFF008"]) && command:
        const res = command.substring(memory["0xFF000"]["0xFF008"].length).trim();
        if (res === "a") {
          //ip a - display network configuration
          display("0x00000", "\nNetwork Configuration:", "0x1F000", "0x0F700");
          display("0x00000", `Type: ${KernelData.config.network.type}`, "0x0F000", "0x0F100");
          if (KernelData.config.network.type === "MANUAL") {
            display("0x00000", `IP Address: ${KernelData.config.network.ip || "Not set"}`, "0x0F000", "0x0F100");
            display("0x00000", `Gateway: ${KernelData.config.network.gateway || "Not set"}`, "0x0F000", "0x0F100");
            display("0x00000", `DNS: ${KernelData.config.network.dns || "Not set"}`, "0x0F000", "0x0F100");
            display("0x00000", `Subnet Mask: ${KernelData.config.network.subnetmask || "Not set"}`, "0x0F000", "0x0F100");
          } else {
            display("0x00000", "DHCP - Automatic configuration", "0x0F000", "0x0F900");
          }
        }
        else if (res === "config") {
          async function configIP() {
            function rl(prefix: string) {
              if (typeof prefix !== "string") {
                display("0x00000", "Prefix must be a string", "0x0F000", "0x0F200");
                return "";
              }
              else {
                return readlineSync.question(prefix);
              }
            }
            
            let running = true;
            const tui_header = "IP Configuration Tool";
            display("0x00000", "\n" + tui_header, "0x1F000", "0x0F700");
            display("0x00000", "Commands: type, ip, gateway, dns, subnet, show, save, exit\n", "0x0F000", "0x0F900");
            
            while (running) {
              let input = rl("ip-config> ");
              if (typeof input !== "string") {
                display("0x00000", "Input must be a string", "0x0F000", "0x0F200");
                continue;
              }
              
              let cmd = input.trim();
              
              if (cmd === "exit") {
                running = false;
                display("0x00000", "Exiting IP configuration", "0x0F000", "0x0F400");
              }
              else if (cmd === "type") {
                let looped = true;
                while (looped) {
                  let inpt = rl("(MANUAL or DHCP)> ");
                  if (typeof inpt === "string") {
                    inpt = inpt.toUpperCase();
                    if (inpt === "DHCP") {
                      KernelData.config.network.type = "DHCP";
                      display("0x00000", "DHCP selected!", "0x0F000", "0x0F400");
                      looped = false;
                    }
                    else if (inpt === "MANUAL") {
                      KernelData.config.network.type = "MANUAL";
                      display("0x00000", "MANUAL selected!", "0x0F000", "0x0F400");
                      looped = false;
                    }
                    else {
                      display("0x00000", "Invalid input. Please enter MANUAL or DHCP", "0x0F000", "0x0F300");
                    }
                  }
                  else {
                    display("0x00000", "Invalid input", "0x0F000", "0x0F200");
                  }
                }
              }
              else if (cmd === "ip") {
                if (KernelData.config.network.type === "DHCP") {
                  display("0x00000", "DHCP is selected! To change the IP address, change type to MANUAL", "0x0F000", "0x0F300");
                }
                else {
                  let inpt = rl("Enter IP address> ");
                  if (typeof inpt === "string" && inpt.trim()) {
                    KernelData.config.network.ip = inpt.trim();
                    display("0x00000", `IP address set to: ${inpt.trim()}`, "0x0F000", "0x0F400");
                  }
                  else {
                    display("0x00000", "Invalid IP address", "0x0F000", "0x0F200");
                  }
                }
              }
              else if (cmd === "gateway") {
                if (KernelData.config.network.type === "DHCP") {
                  display("0x00000", "DHCP is selected! To change the gateway, change type to MANUAL", "0x0F000", "0x0F300");
                }
                else {
                  let inpt = rl("Enter gateway address> ");
                  if (typeof inpt === "string" && inpt.trim()) {
                    KernelData.config.network.gateway = inpt.trim();
                    display("0x00000", `Gateway set to: ${inpt.trim()}`, "0x0F000", "0x0F400");
                  }
                  else {
                    display("0x00000", "Invalid gateway address", "0x0F000", "0x0F200");
                  }
                }
              }
              else if (cmd === "dns") {
                if (KernelData.config.network.type === "DHCP") {
                  display("0x00000", "DHCP is selected! To change DNS, change type to MANUAL", "0x0F000", "0x0F300");
                }
                else {
                  let inpt = rl("Enter DNS server> ");
                  if (typeof inpt === "string" && inpt.trim()) {
                    KernelData.config.network.dns = inpt.trim();
                    display("0x00000", `DNS set to: ${inpt.trim()}`, "0x0F000", "0x0F400");
                  }
                  else {
                    display("0x00000", "Invalid DNS server", "0x0F000", "0x0F200");
                  }
                }
              }
              else if (cmd === "subnet") {
                if (KernelData.config.network.type === "DHCP") {
                  display("0x00000", "DHCP is selected! To change subnet mask, change type to MANUAL", "0x0F000", "0x0F300");
                }
                else {
                  let inpt = rl("Enter subnet mask> ");
                  if (typeof inpt === "string" && inpt.trim()) {
                    KernelData.config.network.subnetmask = inpt.trim();
                    display("0x00000", `Subnet mask set to: ${inpt.trim()}`, "0x0F000", "0x0F400");
                  }
                  else {
                    display("0x00000", "Invalid subnet mask", "0x0F000", "0x0F200");
                  }
                }
              }
              else if (cmd === "show") {
                display("0x00000", "\nCurrent Configuration:", "0x1F000", "0x0F700");
                display("0x00000", `Type: ${KernelData.config.network.type}`, "0x0F000", "0x0F100");
                if (KernelData.config.network.type === "MANUAL") {
                  display("0x00000", `IP: ${KernelData.config.network.ip || "Not set"}`, "0x0F000", "0x0F100");
                  display("0x00000", `Gateway: ${KernelData.config.network.gateway || "Not set"}`, "0x0F000", "0x0F100");
                  display("0x00000", `DNS: ${KernelData.config.network.dns || "Not set"}`, "0x0F000", "0x0F100");
                  display("0x00000", `Subnet: ${KernelData.config.network.subnetmask || "Not set"}`, "0x0F000", "0x0F100");
                }
                display("0x00000", "", "0x0F000", "0x0F100");
              }
              else if (cmd === "save") {
                try {
                  // Load existing data
                  let existingData: any = {};
                  if (existsSync('data.json')) {
                    const data = await readFile('data.json', 'utf-8');
                    existingData = JSON.parse(data);
                  }
                  
                  // Merge network config with existing data
                  existingData.network = KernelData.config.network;
                  
                  // Save back to file
                  await writeFile('data.json', JSON.stringify(existingData, null, 2));
                  
                  display("0x00000", "Configuration saved to data.json", "0x0F000", "0x0F400");
                } catch (err) {
                  const error = err as Error;
                  display("0x00000", `Failed to save configuration: ${error.message}`, "0x0F000", "0x0F200");
                }
              }
              else if (cmd === "") {
                // Empty input, do nothing
              }
              else {
                display("0x00000", `Unknown command: ${cmd}`, "0x0F000", "0x0F200");
                display("0x00000", "Available commands: type, ip, gateway, dns, subnet, show, save, exit", "0x0F000", "0x0F900");
              }
            }
            return;
          }
          await configIP();
        }
        else {
          display("0x00000", "Usage: ip [a|config]", "0x0F000", "0x0F300");
          display("0x00000", "  ip a      - Show network configuration", "0x0F000", "0x0F900");
          display("0x00000", "  ip config - Configure network settings", "0x0F000", "0x0F900");
        }
        break;
      case command.startsWith(memory["0xFF000"]["0xFF009"]) && command:
        const pingTarget = command.substring(memory["0xFF000"]["0xFF009"].length).trim();
        if (!pingTarget) {
          display("0x00000", "Usage: ping [host/ip]", "0x0F000", "0x0F300");
          display("0x00000", "Example: ping google.com", "0x0F000", "0x0F900");
          break;
        }
        
        display("0x00000", `Pinging ${pingTarget}...`, "0x0F000", "0x0F700");
        
        try {
          // Determine OS-specific ping command
          const isWindows = process.platform === "win32";
          const pingCommand = isWindows 
            ? `ping -n 4 ${pingTarget}` 
            : `ping -c 4 ${pingTarget}`;
          
          const { stdout, stderr } = await execPromise(pingCommand);
          
          if (stderr) {
            display("0x00000", `Error: ${stderr}`, "0x0F000", "0x0F200");
          } else {
            // Display ping results
            const lines = stdout.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                if (line.includes('time=') || line.includes('TTL=')) {
                  display("0x00000", line, "0x0F000", "0x0F400");
                } else if (line.includes('packets transmitted') || line.includes('Packets:')) {
                  display("0x00000", line, "0x1F000", "0x0F700");
                } else {
                  display("0x00000", line, "0x0F000", "0x0F100");
                }
              }
            });
          }
        } catch (err) {
          const error = err as Error;
          display("0x00000", `Ping failed: ${error.message}`, "0x0F000", "0x0F200");
          display("0x00000", "Host may be unreachable or invalid", "0x0F000", "0x0F300");
        }
        break;
      default:
        display("0x000DF", memory["0x1FA17"] + command, "0x0F000", "0x0F200");
        break;
    }
  }
  return;
}
function PreL() {
  if (KernelData.clearOnStart) {
    console.clear();
  }  
  function WTM() { //E2E encryption
    const salt = "c3ludGF4TU9SRzA=";
    function saltHandler(input: string) {
      let unSalted = Buffer.from(input, 'base64').toString("utf8");
      return unSalted;
    };
    const postPr = saltHandler(salt);
    memory["0x1E010"] = postPr;
    memory["0x1E020"] = memory["0x1E00F"] + memory["0x1E010"];
    wrt(memory["0x1E020"]);
    let after = Buffer.from(memory["0x1E020"], "utf8").toString("base64");
    let keygen = crypto.createHash('sha256').update(after).digest('hex');
    KernelData.temp.autoE2E_API = keygen;
    if (KernelData.DisplayDebug === true) {
      display("0x00000", "API Key Generated: " + keygen + " DO NOT SHARE WITH ANYONE!", "0x0F000", "0x0F200");
    }
    memory["0x1E020"] = keygen; //lock the API key
    if (typeof memory["0x1E020"] === "string") {
      if (memory["0x1E020"] !== KernelData.temp.autoE2E_API || salt !== "c3ludGF4TU9SRzA=" || after !== "ZGV2ZWxvcGVkIGJ5IHN5bnRheE1PUkcw") {
        exit("0x00000", 0, "End 2 End encryption key is not matching!");
      };
    }
  };
  async function loadUserData() {
    try {
      if (existsSync('data.json')) {
        const data = await readFile('data.json', 'utf-8');
        const parsedData = JSON.parse(data);
        
        // Load username
        if (parsedData.username) {
          KernelData.username = parsedData.username;
          KernelData.logedIn = true;
        }
        
        // Load network configuration
        if (parsedData.network) {
          KernelData.config.network = {
            type: parsedData.network.type || "DHCP",
            ip: parsedData.network.ip || "",
            gateway: parsedData.network.gateway || "",
            dns: parsedData.network.dns || "",
            subnetmask: parsedData.network.subnetmask || ""
          };
          
          if (KernelData.DisplayDebug) {
            display("0x00000", "Network configuration loaded from data.json", "0x0F000", "0x0F400");
          }
        }
      }
    } catch (error) {
      // File doesn't exist or is invalid, ignore
    }
  }
  WTM();
  loadUserData();
  return;
};

const memory: Record<string, any> = {
  "0xF0000": "Lumen ",
  "0xF0001": "~ ",
  "0xF0002": "",
  "0xFF000": {
    //commands
    "0xFF001": "exit",
    "0xFF002": "echo",
    "0xFF003": "help",
    "0xFF005": "clear",
    "0xFF006": "system",
    "0xFF007": "edit",
    "0xFF008": "ip",
    "0xFF009": "ping"
  },
  "0xFFD00": true, //Loop
  "0xFFE07": "", // Will be set after awaiting getLatestCommit()
  "0x1FA17": "Invalid command: ",
  "0x1D6A0": `
  Valid commands:
  -exit
  -echo MESSAGE
  -help
  -clear
  -edit (open editor)
  -ip [a|config] (network configuration)
  -ping [host/ip] (test network connectivity)
  -system
   -u (update)
   -v (version)
   -h (help)
   --ghlogin (login with GitHub)
   --ghlogout (logout from GitHub)
  `,
  "0x1E000": "Task has unexpectely crashed: ",
  "0x1E001": "Task has finished sucsessfully! code 1",
  "0x1E002": "made by syntaxMORG0 ",
  "0x1E009": "System is up to date",
  "0x1E00A": "Set a username",
  "0x1E00B": " - Welcome to Lumen, Type help for commands",
  "0x1E00C": " - developed by syntaxMORG0 ",
  "0x1E00D": "Welcome to Lumen, ",
  "0x1E00E": "!",
  "0x1E00F": "developed by ",
};

//main loop
(async () => {
  PreL(); //pre-load tasks

  memory["0xFFE07"] = await getLatestCommit();

  while (KernelData.running) {
    if (KernelData.DisplayDebug) {
      display("0x00000", memory["0xFFE07"], "0x0F000", "0x0FA00");
    }
    display("0x00000", memory["0xF0000"] + gitCommitHash, "0x1F000", "0x0F100");
    display("0x00000", memory["0x1E00B"], "0x0F000", "0x0F100");
    display("0x00000", memory["0x1E00C"] + memory["0xF0002"], "0x0F000", "0x0F100");
    while (memory["0xFFD00"]) {
      let input = ReadLn("0x00001");
      await CommandEngine(input);
    }
    exit("0x00002", 1);
  }
})();

//Made by syntaxMORG0