import { execSync } from "node:child_process";
import * as vscode from "vscode";
import axios from "axios";

export default async function () {
  try {
    const workspaceFolder = vscode.workspace
      .workspaceFolders as vscode.WorkspaceFolder[];
    const workspaceFolderPath = workspaceFolder[0]?.uri?.fsPath;

    const addedNameOnlyDiff = execSync(
      "git diff --staged --diff-filter=A --name-only",
      {
        encoding: "utf-8",
        cwd: workspaceFolderPath,
      }
    ).toString();

    const stagedDiff = execSync(
      "git diff --staged --diff-filter=CM --unified=0",
      {
        encoding: "utf-8",
        cwd: workspaceFolderPath,
      }
    ).toString();

    if (!stagedDiff.length && !addedNameOnlyDiff.length) {
      vscode.window.showInformationMessage("No staged changes found.");
      return;
    }

    const API_KEY = execSync("echo $OPENAI_API_KEY").toString().trim();
    // const verboseMessage = verbose ? "verbose mode. must include body" : "";
    // gpt4
    // debug
    const body = {
      model: "gpt-3.5-turbo",
      temperature: 0.5,
      stream: false,
      messages: [
        {
          role: "system",
          content: `you are assistant to make commit msg for our team from git diff. msg must be 100 characters or less including space.\nwith under rules. subject should be korean\ncorrect format: <type>(?scope): <subject>\nscope is optional\ntypes:feat->새로운 기능 추가,fix->버그 수정,docs->문서 수정,style->코드 스타일 수정(기능상 변경 없음),refactor->코드 리팩토링,test->테스트 코드 수정,chore->기타 작업,perf->성능 개선,ci->CI 관련 작업,build->빌드 및 패키지 관련 작업 (ex: gulp, broccoli, npm),temp->일시적인 작업\nexample:제목 (필수사항)\nfeat: 플러그인을 추가한다 \n\n본문 (선택사항)\n이미지나 비디오가 아닌 파일을 드래그해서 삽입하는 기능을 추가한다 \n\n꼬리말 (선택사항)\nResolves #123(완료한 티켓 이슈 번호)\nSee also #456, #789(참조가 필요한 티켓 이슈 번호)\nsubjectDescriptions:변경 작업을 문장으로 요약한다,마침표를 사용하지 않고 명령형 어미(ex. -한다)로 마친다\nand example: feat: 이미지나 비디오가 아닌 파일을 드래그해서 삽입하는 플러그인을 추가한다`,
        },
        {
          role: "user",
          content: "my diff ---\n\n" + addedNameOnlyDiff + stagedDiff,
        },
      ],
    };

    const requestSize = body.messages.reduce(
      (acc, cur) => acc + (cur?.content?.length || 0),
      0
    );
    if (requestSize > 10000) {
      vscode.window.showInformationMessage(
        `Too long diff. Please commit or stash your changes. \n${requestSize}`
      );
      return;
    }

    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        cancellable: false,
      },
      (progress) => {
        // (progress, token) =>
        // token.onCancellationRequested(() => {
        //   console.log("User canceled the long running operation");
        // });
        const progresses = [
          {
            increment: 0,
            message: "OPENAI API 요청 중...",
          },
          {
            increment: 40,
            message: "Chat completions 요청 중...",
          },
          {
            increment: 60,
            message: "GPT-3.5-turbo 모델 이용중...",
          },
          {
            increment: 80,
            message: "OPENAI API 대기열이 길어요...",
          },
        ];

        return new Promise((resolve) => {
          let completed = false;

          progresses.forEach((_progress, index) => {
            setTimeout(() => {
              if (completed) {
                return;
              }

              progress.report({
                increment: _progress.increment,
                message: _progress.message,
              });
            }, index * 1000);
          });

          axios("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${API_KEY}`,
            },
            data: JSON.stringify(body),
          })
            .then((res) => {
              completed = true;
              const commitMsg = res.data?.choices?.[0]?.message?.content || "";

              vscode.window
                .showInformationMessage(
                  `결과 "${commitMsg}"`,
                  "클립보드에 복사하기"
                )
                .then((selection) => {
                  if (selection === "클립보드에 복사하기") {
                    vscode.env.clipboard.writeText(commitMsg).then(() => {
                      vscode.window.showInformationMessage(
                        "Text copied to clipboard!"
                      );
                    });
                  }
                });

              resolve("");
            })
            .catch((error) => {
              console.error(error);
              vscode.window.showErrorMessage(error?.message);
            });
        });
      }
    );
  } catch (error) {
    console.error(error);
  }
}

// const main = async () => {
//   const API_KEY = execSync("echo $OPENAI_API_KEY").toString().trim();
//   const argvs = process.argv.slice(2);

//   const spinner = ["|", "/", "-", "\\"];
//   let i = 0;
//   const interval = setInterval(() => {
//     process.stdout.write(`\r${spinner[i++]}`);
//     i %= spinner.length;
//   }, 250);
//   try {
//     if (debug) {
//       console.log(body);
//     }
//     const res = await axios("https://api.openai.com/v1/chat/completions", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${API_KEY}`,
//       },
//       data: JSON.stringify(body),
//     });

//     if (debug) {
//       console.log("request: ", res.request);
//       console.log("response: ", res.data);
//     }

//     const commitMsg = res.data?.choices?.[0]?.message?.content;
//     process.stdout.write(`\r`);
//     clearInterval(interval);

//     if (commitMsg) {
//       console.log(commitMsg);
//       return;
//     }

//     console.log("No commit message generated.");
//   } catch (error) {
//     console.error(error);
//   }
// };
