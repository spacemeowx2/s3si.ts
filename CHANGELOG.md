## 0.4.6

chore: update constants

fix: skip updateState if history if empty
([#81](https://github.com/spacemeowx2/s3si.ts/issues/81))

## 0.4.5

fix: list method is not auto

## 0.4.4

feat: send Anarchy (Open) Power

## 0.4.3

feat: add `list-method` option
([#73](https://github.com/spacemeowx2/s3si.ts/issues/73))

## 0.4.2

fix: `coral_user_id` is string

## 0.4.1

feat: add support for Challenges
([#72](https://github.com/spacemeowx2/s3si.ts/issues/72))

## 0.4.0

feat: update `callImink`

feat: update VersionData

## 0.3.6

feat: update `WEB_VIEW_VERSION` and query hashes for 4.0.0

## 0.3.5

fix: wrong ability keys in some languages

## 0.3.4

fix(gui): GUI ja translation about VS and Salmon Run
([#68](https://github.com/spacemeowx2/s3si.ts/issues/68))

## 0.3.3

feat: add eggstra work mode

## 0.3.2

feat: update `WEB_VIEW_VERSION` and query hashes

## 0.3.1

feat: use ID for uniform(https://stat.ink/api-info/salmon-uniform3)

## 0.3.0

feat: clear state when season change

feat: update `WEB_VIEW_VERSION`

## 0.2.9

feat: update `WEB_VIEW_VERSION`

## 0.2.8

fix: missing team theme

## 0.2.7

fix: RankTracker shouldn't return -1 rankPoint

## 0.2.6

feat: add tri-color support

## 0.2.5

feat: add crown

## 0.2.4

fix: wrong golden eggs (https://github.com/fetus-hina/stat.ink/issues/1167)

## 0.2.3

feat: support big run

## 0.2.2

feat: tracks salmon run grade by group info

## 0.2.1

fix: detect random special

feat: added timestamp to RankState

## 0.2.0

feat: add X match support

## 0.1.39

feat: update `WEB_VIEW_VERSION` and `NSOAPP_VERSION`

## 0.1.38

fix: upgrade between Profreshional +n
([#45](https://github.com/spacemeowx2/s3si.ts/issues/45))

## 0.1.37

feat: avoid duplicate with s3s' upload
([#45](https://github.com/spacemeowx2/s3si.ts/issues/45))

fix: isMySelf is removed

feat(delete-coop): add delete count

## 0.1.36

fix: map special weapon by url
([#42](https://github.com/spacemeowx2/s3si.ts/issues/42))

## 0.1.35

feat: update Queries and `WEB_VIEW_VERSION` to match the latest version of the
NSO.

feat: disable Salmon Run export for now.
([#42](https://github.com/spacemeowx2/s3si.ts/issues/42))

## 0.1.34

feat: add `--with-summary` to export summary data to file

## 0.1.33

fix: RankTracker::getRankStateById (fix
[#36](https://github.com/spacemeowx2/s3si.ts/issues/36))

## 0.1.32

fix: auto promotion will miss point tracking duration an export

## 0.1.31

fix: coop weapon map failed due to a dot
([#33](https://github.com/spacemeowx2/s3si.ts/issues/33))

## 0.1.30

feat: use /api/v3/salmon/weapon

## 0.1.29

feat: add fail_reason for salmon run

## 0.1.28

fix: allow random weapon

feat: save pathname of image in file exporter

## 0.1.27

fix: export error when disconnected

## 0.1.26

fix: missing title_before
([#28](https://github.com/spacemeowx2/s3si.ts/issues/28))

## 0.1.25

fix: missing king_smell
([#28](https://github.com/spacemeowx2/s3si.ts/issues/28))

## 0.1.24

fix: missing coop weapons
([#27](https://github.com/spacemeowx2/s3si.ts/issues/27))

## 0.1.23

feat: add salmon run export to stat.ink

feat: update `WEB_VIEW_VERSION` constant

## 0.1.22

feat: update `WEB_VIEW_VERSION` constant

## 0.1.21

refactor: use `Env::newFetcher` instead of `fetch`

fix: error after stat ink key prompt

## 0.1.20

refactor: splatnet3 is a class now

## 0.1.19

fix: don't set rank_exp_change if isUdemaeUp is true

## 0.1.18

feat: remove gear map workaround

https://github.com/fetus-hina/stat.ink/issues/1127

## 0.1.17

feat: add gears to stat.ink

## 0.1.16

fix: RankTracker broken when token expires

## 0.1.15

fix: rank point change is not uploaded at first challenge
([#11](https://github.com/spacemeowx2/s3si.ts/issues/11))

## 0.1.14

fix: FEST upload failed

## 0.1.13

feat: auto track after promotion challenge success

fix: failed promotion challenge can also lead to tracked promotions

## 0.1.12

feat: add rank tracker

## 0.1.11

feat: use s3s' namespace. (see https://github.com/frozenpandaman/s3s/issues/65
for detail)

refactor: remove `_bid` in exported file

## 0.1.10

fix: missing draw judgement

## 0.1.9

update WEB_VIEW_VERSION

## 0.1.8

feat: add coop export

## 0.1.7

feat: refetch token when 401 close #5

feat: add github link to UA

## 0.1.6

fix: wrong base64 encode/decode. (#4)

## 0.1.5

fix: rank_up sent on last battle of challenge

## 0.1.4

fix: wrong win/lose count in challenge

## 0.1.3

feat: send challenge win/lose count every battle
