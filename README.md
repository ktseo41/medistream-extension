# Medistream Extension

메디스트림 개발자를 위한 VSCode Extension

## Features

반복되는 hotfix 전 작업을 자동화합니다.

1. develop, 메인 브랜치 최신화
2. submodule 최신화
3. 다음 hotfix version으로 package.json, package-lock.json version 업데이트
4. hotfix 브랜치 생성

## How to use

1. `cmd + shift + p`를 눌러 명령어 창을 엽니다.
2. `Hotfix 시작`을 선택합니다.
3. 🎉

## Release Notes

### 0.0.1

초기 기능 완성

### 0.0.2

메인 브랜치명을 git에서 읽어오도록 변경

### 0.0.3

##### commit message 생성 기능 추가 🎉

사용법

- OPENAI에서 API 키 발급 (https://platform.openai.com/account/api-keys)
- `~/.zshrc`, `~/.bashrc`, `~/.bash_profile` 등에 `export OPENAI_API_KEY=YOUR_API_KEY` 추가
- 변경점 git stage에 추가 (ex: `git add .`)
- Cmd + Shift + P, `[Medistream] Commit Message 생성` 선택

commit되지 않은 변경점이 있어도 hotfix가 중단되지 않던 버그 수정

### 0.0.4

- api key가 없을 경우 안내문구, 바로가기 추가. commit message 생성 프롬프트 수정
