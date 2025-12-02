import { get } from 'node:http';
import { styleText } from 'node:util';
import * as readlineSync from "readline-sync";

const KernelData = {
	running: true,
}

async function getLatestCommit() {
    try {
        const owner = "syntaxMORG0";
        const repo = "YOUR_REPO_NAME";
        
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
        
        if (!response.ok) {
            return `GitHub API error: ${response.status}`;
        }
        
        const commits = await response.json();
        
        if (commits.length > 0) {
            const latestCommit = commits[0];
            return `Hash: ${latestCommit.sha.substring(0, 7)}\nAuthor: ${latestCommit.commit.author.name}\nDate: ${latestCommit.commit.author.date}\nMessage: ${latestCommit.commit.message}`;
        }
        return "No commits found";
    } catch (error) {
        return `Error: ${error}`;
    }
}

function display(adress: string, content: string, format: string | undefined, color?: string | undefined) {
	if (adress) {
		if (content) {
			let FormatedText: string | undefined;
			let Color: string = "white"
			let Message: string = content;
			if (format) {
				switch (format) {
					case "0x0F000":
						//Default
						FormatedText = undefined;
						break;
					case "0x1F000":
						//bold
						FormatedText = "bold";
						break;
					case "0x2F000":
						FormatedText = "italic";
						//italic
				};
			};
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
			};
			let styles = FormatedText ? [Color, FormatedText] : [Color];
			let formatedText = styleText(styles as any, Message)
			console.log(formatedText);
		}
		else {
			exit("0x00000", 0);
		};
	} else {
		exit("0x00000", 0);
	}
	return;
};

function exit(adress: string ,code?: number, reason?: string) {
	if (adress) {
		console.log("")
		switch (code) {
			case 0:
				//crashed
				KernelData.running = false;
				console.log(memory["0x1E000"] + reason);
				break;
			case 1:
				//sucsess
				KernelData.running = false;
				display("0x00000", memory["0x1E001"], "0x0F000", "0x0F700")
				break;
			default:
				//undefined
				KernelData.running = false;
				break;
		};
	};
	console.log(styleText("gray", memory["0x1E002"] + memory["0xF0002"]));
	return;
};

function ReadLn(adress?: string, prefix?: string | undefined) {
	return readlineSync.question(prefix ? prefix : "");
};

function CommandEngine(command: string) {
	if (command) {
		switch (command) {
			case memory["0xFF000"]["0xFF001"]:
				memory["0xFFD00"] = false;
				break;
			case command.startsWith(memory["0xFF000"]["0xFF002"]) && command:
				const echoText = command.substring(memory["0xFF000"]["0xFF002"].length).trim();
				if (echoText) {
					display("0x00000", echoText, "0x0F000", "0x0F100");
				}
				break;
			case memory["0xFF000"]["0xFF003"]:
				display("0x00000", memory["0x1D6A0"], "0x0F000", "0x0F100");
				break;
			case command.startsWith(memory["0xFF000"]["0xFF004"]) && command:
				const filename = command.substring(memory["0xFF000"]["0xFF004"].length).trim();
				if (filename) {
					EditorEngine(filename);
				} else {
					display("0x00000", memory["0x1E003"], "0x0F000", "0x0F200");
				}
				break;
			default:
				display("0x000DF", memory["0x1FA17"] + command, "0x0F000", "0x0F100")
				break;
		}
	}
	return;
};

function EditorEngine(filename: string) {
	const lines: string[] = [""];
	let editing = true;
	
	console.clear();
	display("0x00000", memory["0x1E004"] + filename, "0x1F000", "0x0F700");
	display("0x00000", memory["0x1E005"], "0x0F000", "0x0F900");
	console.log("");
	
	while (editing) {
		const input = ReadLn("0x00000", "");
		
		if (input === "\x11") { // Ctrl+Q
			editing = false;
			display("0x00000", memory["0x1E006"], "0x0F000", "0x0F300");
		} else if (input === "\x17") { // Ctrl+W
			memory[filename] = lines.join("\n");
			display("0x00000", memory["0x1E007"] + filename, "0x0F000", "0x0F400");
		} else if (input === "\x18") { // Ctrl+X
			memory[filename] = lines.join("\n");
			display("0x00000", memory["0x1E008"] + filename, "0x0F000", "0x0F400");
			editing = false;
		} else {
			lines.push(input);
		}
	}
	
	console.clear();
};

const memory: Record<string, any> = {
	"0xF0000": "kernel",
	"0xF0001": "~ ",
	"0xF0002": "",
	"0xFF000": { //commands
		"0xFF001": "exit",
		"0xFF002": "echo",
		"0xFF003": "help",
		"0xFF004": "nano",
	},
	"0xFFD00": true, //Loop
	"0xFFE07": getLatestCommit(),
	"0x1FA17": "Invalid command: ",
	"0x1D6A0": "Vaild commands:\n-exit\n-echo MESSAGE\n-help\n-nano FILENAME",
	"0x1E000": "The program has unexpectely crashed: ",
	"0x1E001": "Program Has finished sucsessfully! code 1",
	"0x1E002": "made by syntaxMORG0 ",
	"0x1E003": "Usage: nano FILENAME",
	"0x1E004": "Nano - ",
	"0x1E005": "Commands: Ctrl+W = save, Ctrl+Q = quit, Ctrl+X = save & quit",
	"0x1E006": "Editor closed without saving",
	"0x1E007": "Saved to memory: ",
	"0x1E008": "Saved and closed: ",
};

//main loop
while (KernelData.running) {
	display("0x00000", memory["0xFFE07"], "0x0F000", "0x0FA00");
	display("0x00000", memory["0xF0000"], "0x0F000", "0x0F100");
	while (memory["0xFFD00"]) {
		let input = ReadLn("0x00001", memory["0xF0001"]);
		CommandEngine(input);
	};
	exit("0x00002", 1);
};

//Made by syntaxMORG0