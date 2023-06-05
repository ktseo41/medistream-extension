// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import { execSync } from "node:child_process";
import path from "path";

function updateVersion(targetPackage: string, version: string) {
  const file = fs.readFileSync(targetPackage, "utf8");
  const json = JSON.parse(file);
  json.version = version;
  fs.writeFileSync(targetPackage, JSON.stringify(json, null, 2));
}

function startHotfixWithProgress() {
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Hotfix 시작",
      cancellable: true,
    },
    (progress, token) => {
      token.onCancellationRequested(() => {
        console.log("User canceled the long running operation");
      });

      return startHotfix(progress);
    }
  );
}

async function startHotfix(
  progress: vscode.Progress<{ message?: string; increment?: number }>
) {
  try {
    const workspacePath = (await initHotfix()) || "";
    progress.report({
      increment: 20,
      message: "develop 브랜치를 pull 하는 중입니다.",
    });
    execSync("git checkout develop && git pull origin develop", {
      cwd: workspacePath,
    });
    const mainBranchName = execSync(
      "git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'",
      {
        cwd: workspacePath,
      }
    ).toString();
    progress.report({
      increment: 20,
      message: `${mainBranchName} 브랜치를 pull 하는 중입니다.`,
    });
    execSync(`git checkout ${mainBranchName}`, {
      cwd: workspacePath,
    });
    execSync(`git pull origin ${mainBranchName}`, {
      cwd: workspacePath,
    });
    progress.report({
      increment: 20,
      message: "패키지 버전을 업데이트 중입니다.",
    });
    const hotfixVersion = await updatePackagesVersion(workspacePath);
    progress.report({
      increment: 20,
      message: "hotfix 브랜치를 생성 중입니다.",
    });
    await checkoutToHotfixBranch(hotfixVersion);
  } catch (error) {
    vscode.window.showErrorMessage(
      `${(error as Error)?.message}\n${(error as Error)?.stack}}`
    );
    console.error((error as Error)?.message);
    console.error((error as Error)?.stack);
  }
}

async function initHotfix() {
  const workspaceFolder = vscode.workspace
    .workspaceFolders as vscode.WorkspaceFolder[];
  const workspaceFolderPath = workspaceFolder[0]?.uri?.fsPath;
  const output = execSync("git diff-index HEAD --", {
    cwd: workspaceFolderPath,
  }).toString();
  const lines = output.split("\n").filter((line) => line.length > 0);
  const fileNames = lines
    .map((line) => line.split(" "))
    .map(([, , , , fileName]) => fileName)
    .map((fileName) => fileName.replace("M\t", ""));
  if (fileNames.length > 0) {
    if (fileNames.every((fileName) => fileName.includes("submodules"))) {
      const selection = await vscode.window.showInformationMessage(
        `submodules 변경점이 있습니다. submodule을 update 하시겠습니까?`,
        "Yes",
        "No"
      );

      if (selection === "Yes") {
        execSync("git submodule update --remote", {
          cwd: workspaceFolderPath,
        });
        return workspaceFolderPath;
      }
    }
    vscode.window.showErrorMessage(
      `commit 하지 않은 변경점이 있습니다. - ${fileNames
        .map((n) => `'${n}'`)
        .join(",")}. commit이나 stash 후 다시 시도해주세요.`
    );
  }

  return workspaceFolderPath;
}

async function updatePackagesVersion(workspaceFolderPath: string) {
  const nextVersion = (() => {
    const file = fs.readFileSync(
      path.join(workspaceFolderPath!, "package.json"),
      "utf-8"
    );
    const packageJson = JSON.parse(file);
    const version = packageJson.version.split(".");
    version[2] = parseInt(version[2]) + 1;
    return version.join(".");
  })() as string;

  updateVersion(path.join(workspaceFolderPath!, "package.json"), nextVersion);
  updateVersion(
    path.join(workspaceFolderPath!, "package-lock.json"),
    nextVersion
  );

  return nextVersion;
}

async function checkoutToHotfixBranch(hotfixVersion: string) {
  let terminal = vscode.window.activeTerminal;

  if (!terminal) {
    terminal = vscode.window.createTerminal();
    terminal.show();
  }

  terminal.sendText(`git checkout -b hotfix/${hotfixVersion}`, true);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log(
    'Congratulations, your extension "medistream-extension" is now active!'
  );

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "medistream-extension.startHotfix",
    () => {
      const workspaceFolder = vscode.workspace.workspaceFolders;

      if (!workspaceFolder) {
        vscode.window.showErrorMessage("열려있는 디렉토리가 없습니다.");
        return;
      }

      try {
        startHotfixWithProgress();
      } catch (error) {}
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
    }
  );

  context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
