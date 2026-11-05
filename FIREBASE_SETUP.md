# Firebase 연결 마무리 (로그인 없음)

firebase-config.js의 프로젝트 설정을 사용합니다. Authentication과 members 등록은 필요하지 않습니다.

1. Firebase 콘솔 → Firestore Database → Rules에서 이 저장소의 `firestore.rules` 전체 내용을 붙여 넣고 게시합니다. 이전 members 기반 규칙을 새 규칙으로 교체해야 합니다.
2. `index.html`, `firebase-config.js`, `firebase-client.js`를 같은 폴더에 배포합니다. 로컬에서는 `python3 -m http.server 8000` 실행 후 http://localhost:8000 으로 접속합니다.
3. 사이트를 새로고침합니다. 연결되면 '둘이 같이 쓰는 기록 · 실시간 반영돼요'가 표시됩니다.
4. 기존 기록이 있는 브라우저에서 '기존 기기 기록 가져오기'를 누릅니다. 클라우드에 같은 ID가 있으면 기존 클라우드 값을 유지합니다.
5. 도장을 찍거나 내 기록에 가게를 추가합니다. 다른 브라우저에서 반영되는지 확인합니다. 수정과 삭제도 공유됩니다.

Firestore 문서는 첫 저장 시 자동 생성됩니다. workspaces 문서나 members 배열을 직접 만들 필요가 없습니다. 기존 members 문서가 남아 있어도 사용하지 않습니다.

## 데이터 경로

- workspaces/our-food-log/stamps-jjamppong/{가게ID}
- workspaces/our-food-log/stamps-gukbap/{가게ID}
- workspaces/our-food-log/stamps-donkatsu/{가게ID}
- workspaces/our-food-log/mylog/{기록ID}

이 설정은 위 네 컬렉션을 공개합니다. 누구나 인증 없이 해당 기록을 조회·추가·수정·삭제할 수 있습니다. 다른 경로는 기본 거부됩니다. workspaceId를 바꾸면 규칙의 our-food-log도 함께 바꿔야 합니다.

연결 전 기록은 기기에 저장됩니다. 기존 기록 사본은 localStorage의 firebase-migration-backup-v1에 보관합니다. 로그인 기능과 Google 인증 SDK는 제거했습니다. 기기 식별자는 작성자 표시에만 사용합니다.

실제 서버의 규칙 게시와 브라우저 저장 검증은 별도로 진행해야 합니다.

## inbox.json 업로드

사이트 상단의 **JSON 파일 가져오기**를 누르고 `inbox.json`을 선택합니다. 연결이 준비되면 버튼이 활성화됩니다. 2MB 이하의 `gomjji-matjip-inbox` version 1 파일을 지원합니다. 배포 시 `inbox-import.mjs`도 firebase-client.js와 같은 폴더에 포함하세요.

파일 전체의 형식, 가게 ID, 날짜, 별점을 먼저 검사합니다. 통과하면 각 기록을 Firestore 트랜잭션으로 저장합니다. 기존 가게 정보와 메모는 유지하고 새 방문을 합칩니다. 같은 날짜·메모·작성자의 방문은 파일에 들어 있는 횟수까지 유지하므로 같은 파일을 다시 가져와도 누적되지 않습니다. 파일의 작성자 이름도 화면에 표시합니다.

진행률과 성공·실패 결과가 버튼 아래 표시됩니다. 여러 문서를 한 번에 저장하는 작업 전체가 원자적이지는 않으며, 도중 실패하면 일부는 저장될 수 있습니다. 실패 메시지의 저장 건수를 확인하고 같은 파일로 재시도할 수 있습니다. 가져오기는 온라인 연결이 필요합니다. 원본 JSON 파일을 서버에 보관하거나 자동으로 비우지는 않습니다. Firestore에는 변환된 기록만 저장합니다.

별도 Rules 변경은 필요 없습니다. 예시 파일의 note에 있는 자동 이동·비우기 설명은 현재 동작이 아니며, 파일 선택 시에만 가져옵니다.
