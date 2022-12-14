export default {
  definitions: {
    BankaraMatchChallenge: {
      properties: {
        winCount: { type: "uint32" },
        loseCount: { type: "uint32" },
        maxWinCount: { type: "uint32" },
        maxLoseCount: { type: "uint32" },
        state: { enum: ["FAILED", "SUCCEEDED", "INPROGRESS"] },
        isPromo: { type: "boolean" },
        isUdemaeUp: { type: "boolean", nullable: true },
        udemaeAfter: { type: "string", nullable: true },
        earnedUdemaePoint: { type: "int32", nullable: true },
      },
    },
    XMatchMeasurement: {
      properties: {
        state: { enum: ["COMPLETED", "INPROGRESS"] },
        xPowerAfter: { type: "float64", nullable: true },
        isInitial: { type: "boolean" },
        winCount: { type: "uint32" },
        loseCount: { type: "uint32" },
        maxWinCount: { type: "uint32" },
        maxLoseCount: { type: "uint32" },
        maxInitialBattleCount: { type: "uint32" },
        vsRule: {
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            rule: { ref: "VsRule" },
          },
        },
      },
    },
    VsRule: {
      enum: [
        "TURF_WAR",
        "AREA",
        "LOFT",
        "GOAL",
        "CLAM",
        "TRI_COLOR",
      ],
    },
    VsMode: {
      enum: [
        "REGULAR",
        "BANKARA",
        "PRIVATE",
        "FEST",
        "X_MATCH",
      ],
    },
    Image: {
      optionalProperties: {
        url: { type: "string" },
        width: { type: "uint32" },
        height: { type: "uint32" },
        maskImageUrl: { type: "string" },
        overlayImageUrl: { type: "string" },
      },
    },
    CoopHistoryGroup: {
      properties: {
        startTime: { type: "timestamp", nullable: true },
        endTime: { type: "timestamp", nullable: true },
        highestResult: {
          properties: {
            grade: {
              properties: {
                id: { type: "string" },
              },
            },
            gradePoint: { type: "uint32" },
            jobScore: { type: "uint32" },
          },
          nullable: true,
        },
      },
    },
    VsPlayerWeapon: {
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        image: { ref: "Image" },
        subWeapon: {
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            image: { ref: "Image" },
          },
        },
        specialWeapon: {
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            image: { ref: "Image" },
            maskingImage: { ref: "Image" },
          },
        },
        image2d: { ref: "Image" },
        image3d: { ref: "Image" },
        image2dThumbnail: { ref: "Image" },
        image3dThumbnail: { ref: "Image" },
      },
    },
    GearPower: {
      properties: {
        name: { type: "string" },
        desc: { type: "string" },
        image: { ref: "Image" },
        isEmptySlot: { type: "boolean" },
      },
    },
    PlayerGear: {
      properties: {
        __isGear: {
          enum: [
            "HeadGear",
            "ClothingGear",
            "ShoesGear",
          ],
        },
        name: { type: "string" },
        thumbnailImage: { ref: "Image" },
        originalImage: { ref: "Image" },
        primaryGearPower: {
          properties: {
            name: { type: "string" },
            image: { ref: "Image" },
          },
        },
        additionalGearPowers: {
          elements: {
            properties: {
              name: { type: "string" },
              image: { ref: "Image" },
            },
          },
        },
        brand: {
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            image: { ref: "Image" },
            usualGearPower: { ref: "GearPower" },
          },
        },
      },
    },
    VsPlayer: {
      properties: {
        id: { type: "string" },
        nameId: { type: "string", nullable: true },
        name: { type: "string" },
        isMyself: { type: "boolean" },
        byname: { type: "string" },
        nameplate: {
          properties: {
            badges: {
              elements: {
                properties: {
                  id: { type: "string" },
                  image: { ref: "Image" },
                },
                nullable: true,
              },
            },
            background: {
              properties: {
                id: { type: "string" },
                textColor: { ref: "Color" },
                image: { ref: "Image" },
              },
            },
          },
        },
        weapon: { ref: "VsPlayerWeapon" },
        species: { enum: ["INKLING", "OCTOLING"] },
        result: {
          properties: {
            kill: { type: "uint32" },
            death: { type: "uint32" },
            assist: { type: "uint32" },
            special: { type: "uint32" },
            noroshiTry: { type: "uint32", nullable: true },
          },
          nullable: true,
        },
        paint: { type: "uint32" },

        headGear: { ref: "PlayerGear" },
        clothingGear: { ref: "PlayerGear" },
        shoesGear: { ref: "PlayerGear" },
      },
      additionalProperties: true,
    },
    Color: {
      properties: {
        a: { type: "float64" },
        b: { type: "float64" },
        g: { type: "float64" },
        r: { type: "float64" },
      },
    },
    VsJudgement: {
      enum: [
        "LOSE",
        "WIN",
        "DEEMED_LOSE",
        "EXEMPTED_LOSE",
        "DRAW",
      ],
    },
    VsTeam: {
      properties: {
        color: { ref: "Color" },
        players: {
          elements: {
            ref: "VsPlayer",
          },
        },
        result: {
          properties: {
            paintRatio: { type: "float32", nullable: true },
            score: { type: "uint32", nullable: true },
            noroshi: { type: "uint32", nullable: true },
          },
          nullable: true,
        },
        judgement: { ref: "VsJudgement", nullable: true },
      },
      additionalProperties: true,
    },
    VsHistoryDetail: {
      properties: {
        id: {
          type: "string",
        },
        vsRule: {
          properties: {
            name: { type: "string" },
            id: { type: "string" },
            rule: { ref: "VsRule" },
          },
        },
        vsMode: {
          properties: {
            id: { type: "string" },
            mode: { ref: "VsMode" },
          },
        },
        vsStage: {
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            image: { ref: "Image" },
          },
        },
        xMatch: {
          properties: {
            lastXPower: { type: "float64", nullable: true },
          },
          nullable: true,
        },
        playedTime: { type: "timestamp" },
        bankaraMatch: {
          properties: {
            earnedUdemaePoint: { type: "int32", nullable: true },
            mode: { enum: ["OPEN", "CHALLENGE"] },
          },
          nullable: true,
        },
        festMatch: {
          properties: {
            dragonMatchType: {
              enum: [
                "NORMAL",
                "DECUPLE",
                "DRAGON",
                "DOUBLE_DRAGON",
              ],
            },
            contribution: { type: "uint32" },
            jewel: { type: "uint32" },
            myFestPower: { type: "uint32", nullable: true },
          },
          nullable: true,
        },

        myTeam: {
          ref: "VsTeam",
        },
        otherTeams: {
          elements: {
            ref: "VsTeam",
          },
        },
        judgement: { ref: "VsJudgement" },
        knockout: {
          enum: [
            "NEITHER",
            "WIN",
            "LOSE",
          ],
          nullable: true,
        },
        awards: {
          elements: {
            properties: {
              name: { type: "string" },
              rank: { type: "string" },
            },
          },
        },
        duration: { type: "uint32" },
      },
      additionalProperties: true,
    },
    CoopHistoryDetail: {
      properties: {
        id: { type: "string" },
        afterGrade: {
          properties: {
            id: { type: "string" },
            name: { type: "string" },
          },
        },
      },
    },
  },
} as const;
