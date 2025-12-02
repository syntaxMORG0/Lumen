import { clear, log } from "node:console";
import { get } from "node:http";
import { styleText } from "node:util";
import { startupSnapshot } from "node:v8";
import * as readlineSync from "readline-sync";
import { readFile } from "fs/promises";

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
    Repo: "Lumen"
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

function ReadLn(adress?: string, prefix?: string | undefined) {
  if (KernelData.username != "") {
    return readlineSync.question(
      prefix
        ? prefix
        : styleText("green", KernelData.username + "@lumen ~ ")
    );
  }
  else {
    return readlineSync.question(
      prefix ? prefix : styleText("green", "guest@lumen ~ "),
    );
  }
}

function CommandEngine(command: string) {
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
          const readlineSync = require('readline-sync');
          const fs = require('fs');
          const fetch = require('node-fetch');
                    
          function Readtoken() {
            return readlineSync.question(memory["0xF0002"] + " Token: ");
          }

          let token = Readtoken();
          
          async function logInWithGithub(token) {
            if (!token) {
              display("0x00000", "No token provided!", "0x0F000", "0x0F200");
              return;
            }
            try {
              const response = await fetch('https://api.github.com/user', {
                headers: {
                  'Authorization': `token ${token}`,
                  'User-Agent': 'Node.js CLI Script'
                }
              });
              if (!response.ok) {
                display("0x00000", "Failed to fetch user info. Check your token.", "0x0F000", "0x0F200");
                return;
              }
              const responseFromJSON = await fetch('data.json');
              const data: { username: string } = await responseFromJSON.json();
              const username = data.username;
              console.log('Username:', username);
            } catch (err) {
              exit("0x00000",0, "Error:" + err.message);
            }
          }
          logInWithGithub(token); 
        }
        else {
          display("0x00000", "missing arguments!", "0x0F000", "0x0F200");
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
  function CheckJSONfile(file) {
    //check for 
  }
  return;
}

const memory: Record<string, any> = {
  "0xF0000": "Lumen ",
  "0xF0001": "~ ",
  "0xF0002": "",
  "0xFF000": {
    //commands
    "0xFF001": "exit",
    "0xFF002": "echo",
    "0xFF003": "help",
    "0xFF005": "clear",
    "0xFF006": "system",
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
  -system
   -u (update)
   -v (version)
   -h (help)
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
      CommandEngine(input);
    }
    exit("0x00002", 1);
  }
})();

//Made by syntaxMORG0