# Firebase 연결 (둘만 로그인해서 쓰기)

곰찌와 남자친구 두 계정만 기록을 읽고 쓸 수 있습니다. 다른 사람은 사이트 주소나 저장소를 알아도 기록을 볼 수 없습니다.

## 처음 한 번 설정하기

**순서가 중요합니다.** 새 코드를 먼저 올리고 두 사람이 로그인한 다음에 규칙을 바꿔야 기록이 끊기지 않습니다.

1. Firebase 콘솔 → Authentication → 시작하기 → Sign-in method → **이메일/비밀번호** 사용 설정
2. Authentication → Users → **사용자 추가**로 두 계정을 만들고 각자의 **사용자 UID**를 복사합니다. 이메일 칸에는 `아이디@matjip.example.com` 형식으로 적습니다(예: `gomjji@matjip.example.com`). 로그인 화면에서는 `gomjji`처럼 아이디만 입력하면 됩니다. `example.com`은 예약된 주소라서 메일이 가지 않습니다.
3. `firebase-config.js`의 `members`와 `firestore.rules`에 두 UID를 넣습니다. (2026-11-09 등록 완료)
4. `firebase-config.js`, `firebase-client.js`, `firestore.rules`, 이 설명서를 저장소에 올립니다.
5. 사이트를 열어 두 사람 모두 로그인합니다. 아이폰 홈 화면 앱은 사파리와 로그인이 따로라서 앱에서도 한 번 로그인합니다.
6. Firebase 콘솔 → Firestore Database → Rules에 `firestore.rules` 내용을 붙여 넣고 **게시**합니다. 이때부터 두 사람만 기록을 볼 수 있습니다.
7. (권장) Authentication → 설정 → 사용자 작업에서 **가입(계정 만들기) 허용**을 끕니다.

UID와 Firebase 웹 설정값(apiKey 등)은 비밀번호가 아니어서 공개 저장소에 있어도 됩니다. 보호는 Firebase 서버의 Firestore 규칙이 합니다. 저장소의 `firestore.rules`는 사본이며, 실제 규칙은 콘솔에서 게시해야 적용됩니다. **비밀번호는 저장소나 채팅에 적지 마세요.**

## 사용하기

- 로그인 화면에서 아이디와 비밀번호를 입력합니다. 한 번 로그인한 기기는 로그아웃하기 전까지 유지됩니다.
- 기록 도구의 🚪 버튼을 두 번 누르면 로그아웃합니다.
- 비밀번호를 잊으면 Firebase 콘솔 → Authentication → Users에서 비밀번호를 다시 설정합니다.

## 데이터 경로

- workspaces/our-food-log/stamps-jjamppong/{가게ID}
- workspaces/our-food-log/stamps-gukbap/{가게ID}
- workspaces/our-food-log/stamps-donkatsu/{가게ID}
- workspaces/our-food-log/mylog/{기록ID}

workspaceId를 바꾸면 규칙의 our-food-log도 함께 바꿔야 합니다. 연결 전 기록 사본은 localStorage의 firebase-migration-backup-v1에 보관합니다.

## inbox.json 업로드

사이트 상단의 **JSON 파일 가져오기**를 누르고 `inbox.json`을 선택합니다. 연결이 준비되면 버튼이 활성화됩니다. 2MB 이하의 `gomjji-matjip-inbox` version 1 파일을 지원합니다. 배포 시 `inbox-import.mjs`도 firebase-client.js와 같은 폴더에 포함하세요.

파일 전체의 형식, 가게 ID, 날짜, 별점을 먼저 검사합니다. 통과하면 각 기록을 Firestore 트랜잭션으로 저장합니다. 기존 가게 정보와 메모는 유지하고 새 방문을 합칩니다. 같은 날짜·메모·작성자의 방문은 파일에 들어 있는 횟수까지 유지하므로 같은 파일을 다시 가져와도 누적되지 않습니다. 파일의 작성자 이름도 화면에 표시합니다.

진행률과 성공·실패 결과가 버튼 아래 표시됩니다. 여러 문서를 한 번에 저장하는 작업 전체가 원자적이지는 않으며, 도중 실패하면 일부는 저장될 수 있습니다. 실패 메시지의 저장 건수를 확인하고 같은 파일로 재시도할 수 있습니다. 가져오기는 온라인 연결이 필요합니다. 원본 JSON 파일을 서버에 보관하거나 자동으로 비우지는 않습니다. Firestore에는 변환된 기록만 저장합니다.

로그인한 상태에서만 가져올 수 있습니다. 예시 파일의 note에 있는 자동 이동·비우기 설명은 현재 동작이 아니며, 파일 선택 시에만 가져옵니다.
