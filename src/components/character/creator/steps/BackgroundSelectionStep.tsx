// src/components/character/creator/steps/BackgroundSelectionStep.tsx

"use client";

import React, { useState } from "react";
import { Search, Book, Users, Hammer, Crown } from "lucide-react";
import { StepComponentProps, Background } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

// Mock background data - in a real app, this would come from an API or database
const AVAILABLE_BACKGROUNDS: Background[] = [
  {
    id: "acolyte",
    name: "Acolyte",
    description:
      "You have spent your life in the service of a temple to a specific god or pantheon of gods.",
    skillProficiencies: ["Insight", "Religion"],
    languages: ["Two of your choice"],
    equipment: [
      {
        item_id: "holy-symbol",
        name: "Holy symbol",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "prayer-book",
        name: "Prayer book or prayer wheel",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "incense",
        name: "5 sticks of incense",
        quantity: 5,
        equipped: false,
      },
      { item_id: "vestments", name: "Vestments", quantity: 1, equipped: false },
      {
        item_id: "common-clothes",
        name: "Set of common clothes",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "pouch",
        name: "Belt pouch containing 15 gp",
        quantity: 1,
        equipped: false,
        value: 15,
      },
    ],
    feature: {
      name: "Shelter of the Faithful",
      description:
        "As an acolyte, you command the respect of those who share your faith, and you can perform the religious ceremonies of your deity.",
    },
    suggestedCharacteristics: {
      personality: [
        "I idolize a particular hero of my faith, and constantly refer to that person's deeds and example.",
        "I can find common ground between the fiercest enemies, empathizing with them and always working toward peace.",
        "I see omens in every event and action. The gods try to speak to us, we just need to listen.",
        "Nothing can shake my optimistic attitude.",
      ],
      ideals: [
        "Tradition. The ancient traditions of worship and sacrifice must be preserved and upheld.",
        "Charity. I always try to help those in need, no matter what the personal cost.",
        "Change. We must help bring about the changes the gods are constantly working in the world.",
        "Power. I hope to one day rise to the top of my faith's religious hierarchy.",
      ],
      bonds: [
        "I would die to recover an ancient relic of my faith that was lost long ago.",
        "I will someday get revenge on the corrupt temple hierarchy who branded me a heretic.",
        "I owe my life to the priest who took me in when my parents died.",
        "Everything I do is for the common people.",
      ],
      flaws: [
        "I judge others harshly, and myself even more severely.",
        "I put too much trust in those who wield power within my temple's hierarchy.",
        "My piety sometimes leads me to blindly trust those that profess faith in my god.",
        "I am inflexible in my thinking.",
      ],
    },
  },
  {
    id: "criminal",
    name: "Criminal",
    description:
      "You are an experienced criminal with a history of breaking the law.",
    skillProficiencies: ["Deception", "Stealth"],
    languages: [],
    equipment: [
      { item_id: "crowbar", name: "Crowbar", quantity: 1, equipped: false },
      {
        item_id: "dark-clothes",
        name: "Set of dark common clothes including a hood",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "pouch",
        name: "Belt pouch containing 15 gp",
        quantity: 1,
        equipped: false,
        value: 15,
      },
    ],
    feature: {
      name: "Criminal Contact",
      description:
        "You have a reliable and trustworthy contact who acts as your liaison to a network of other criminals.",
    },
    suggestedCharacteristics: {
      personality: [
        "I always have a plan for what to do when things go wrong.",
        "I am always calm, no matter what the situation. I never raise my voice or let my emotions control me.",
        "The first thing I do in a new place is note the locations of everything valuable—or where such things could be hidden.",
        "I would rather make a new friend than a new enemy.",
      ],
      ideals: [
        "Honor. I don't steal from others in the trade.",
        "Freedom. Chains are meant to be broken, as are those who would forge them.",
        "Charity. I steal from the wealthy so that I can help people in need.",
        "Greed. I will do whatever it takes to become wealthy.",
      ],
      bonds: [
        "I'm trying to pay off an old debt I owe to a generous benefactor.",
        "My ill-gotten gains go to support my family.",
        "Something important was taken from me, and I aim to steal it back.",
        "I will become the greatest thief that ever lived.",
      ],
      flaws: [
        "When I see something valuable, I can't think about anything but how to steal it.",
        "When faced with a choice between money and my friends, I usually choose the money.",
        "If there's a plan, I'll forget it. If I don't forget it, I'll ignore it.",
        "I have a 'tell' that reveals when I'm lying.",
      ],
    },
  },
  {
    id: "folk-hero",
    name: "Folk Hero",
    description:
      "You come from a humble social rank, but you are destined for so much more.",
    skillProficiencies: ["Animal Handling", "Survival"],
    languages: [],
    equipment: [
      {
        item_id: "artisan-tools",
        name: "Set of artisan's tools",
        quantity: 1,
        equipped: false,
      },
      { item_id: "shovel", name: "Shovel", quantity: 1, equipped: false },
      {
        item_id: "iron-pot",
        name: "Set of artisan's tools",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "common-clothes",
        name: "Set of common clothes",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "pouch",
        name: "Belt pouch containing 10 gp",
        quantity: 1,
        equipped: false,
        value: 10,
      },
    ],
    feature: {
      name: "Rustic Hospitality",
      description:
        "Since you come from the ranks of the common folk, you fit in among them with ease.",
    },
    suggestedCharacteristics: {
      personality: [
        "I judge people by their actions, not their words.",
        "If someone is in trouble, I'm always ready to lend help.",
        "When I set my mind to something, I follow through no matter what gets in my way.",
        "I have a strong sense of fair play and always try to find the most equitable solution to arguments.",
      ],
      ideals: [
        "Respect. People deserve to be treated with dignity and respect.",
        "Fairness. No one should get preferential treatment before the law, and no one is above the law.",
        "Freedom. Tyrants must not be allowed to oppress the people.",
        "Might. If I become strong, I can take what I want—what I deserve.",
      ],
      bonds: [
        "I have a family, but I have no idea where they are. I hope to see them again one day.",
        "I worked the land, I love the land, and I will protect the land.",
        "A proud noble once gave me a horrible beating, and I will take my revenge on any bully I encounter.",
        "My tools are symbols of my past life, and I carry them so that I will never forget my roots.",
      ],
      flaws: [
        "The tyrant who rules my land will stop at nothing to see me killed.",
        "I'm convinced of the significance of my destiny, and blind to my shortcomings and the risk of failure.",
        "The people who knew me when I was young know my shameful secret, so I can never go home again.",
        "I have a weakness for the vices of the city, especially hard drink.",
      ],
    },
  },
  {
    id: "noble",
    name: "Noble",
    description:
      "You understand wealth, power, and privilege. You carry a noble title.",
    skillProficiencies: ["History", "Persuasion"],
    languages: ["One of your choice"],
    equipment: [
      {
        item_id: "fine-clothes",
        name: "Set of fine clothes",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "signet-ring",
        name: "Signet ring",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "scroll-pedigree",
        name: "Scroll of pedigree",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "purse",
        name: "Purse containing 25 gp",
        quantity: 1,
        equipped: false,
        value: 25,
      },
    ],
    feature: {
      name: "Position of Privilege",
      description:
        "Thanks to your noble birth, people are inclined to think the best of you.",
    },
    suggestedCharacteristics: {
      personality: [
        "My eloquent flattery makes everyone I talk to feel like the most wonderful and important person in the world.",
        "The common folk love me for my kindness and generosity.",
        "No one could doubt by looking at my regal bearing that I am a cut above the unwashed masses.",
        "I take great pains to always look my best and follow the latest fashions.",
      ],
      ideals: [
        "Respect. Respect is due to me because of my position, but all people regardless of station deserve to be treated with dignity.",
        "Responsibility. It is my duty to respect the authority of those above me, just as those below me must respect mine.",
        "Independence. I must prove that I can handle myself without the coddling of my family.",
        "Power. If I can attain more power, no one will tell me what to do.",
      ],
      bonds: [
        "I will face any challenge to win the approval of my family.",
        "My house's alliance with another noble family must be sustained at all costs.",
        "Nothing is more important than the other members of my family.",
        "I am in love with the heir of a family that my family despises.",
      ],
      flaws: [
        "I secretly believe that everyone is beneath me.",
        "I hide a truly scandalous secret that could ruin my family forever.",
        "I too often hear veiled insults and threats where none exist.",
        "I have an insatiable desire for carnal pleasures.",
      ],
    },
  },
  {
    id: "sage",
    name: "Sage",
    description: "You spent years learning the lore of the multiverse.",
    skillProficiencies: ["Arcana", "History"],
    languages: ["Two of your choice"],
    equipment: [
      {
        item_id: "ink",
        name: "Bottle of black ink",
        quantity: 1,
        equipped: false,
      },
      { item_id: "quill", name: "Quill", quantity: 1, equipped: false },
      { item_id: "knife", name: "Small knife", quantity: 1, equipped: false },
      {
        item_id: "letter",
        name: "Letter from a dead colleague",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "common-clothes",
        name: "Set of common clothes",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "pouch",
        name: "Belt pouch containing 10 gp",
        quantity: 1,
        equipped: false,
        value: 10,
      },
    ],
    feature: {
      name: "Researcher",
      description:
        "When you attempt to learn or recall a piece of lore, if you do not know that information, you often know where and from whom you can obtain it.",
    },
    suggestedCharacteristics: {
      personality: [
        "I use polysyllabic words that convey the impression of great erudition.",
        "I've read every book in the world's greatest libraries—or I like to boast that I have.",
        "I am horribly, horribly awkward in social situations.",
        "I am convinced that people are always trying to steal my secrets.",
      ],
      ideals: [
        "Knowledge. The path to power and self-improvement is through knowledge.",
        "Beauty. What is beautiful points us beyond itself toward what is true.",
        "Logic. Emotions must not cloud our logical thinking.",
        "No Limits. Nothing should fetter the infinite possibility inherent in all existence.",
      ],
      bonds: [
        "It is my duty to protect my students.",
        "I have an ancient text that holds terrible secrets that must not fall into the wrong hands.",
        "I work to preserve a library, university, scriptorium, or monastery.",
        "My life's work is a series of tomes related to a specific field of lore.",
      ],
      flaws: [
        "I am easily distracted by the promise of information.",
        "Most people scream and run when they see a demon. I stop and take notes on its anatomy.",
        "Unlocking an ancient mystery is worth the price of a civilization.",
        "I overlook obvious solutions in favor of complicated ones.",
      ],
    },
  },
  {
    id: "soldier",
    name: "Soldier",
    description: "War has been your life for as long as you care to remember.",
    skillProficiencies: ["Athletics", "Intimidation"],
    languages: [],
    equipment: [
      {
        item_id: "rank-insignia",
        name: "Insignia of rank",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "trophy",
        name: "Trophy taken from fallen enemy",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "deck-cards",
        name: "Deck of cards",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "common-clothes",
        name: "Set of common clothes",
        quantity: 1,
        equipped: false,
      },
      {
        item_id: "pouch",
        name: "Belt pouch containing 10 gp",
        quantity: 1,
        equipped: false,
        value: 10,
      },
    ],
    feature: {
      name: "Military Rank",
      description: "You have a military rank from your career as a soldier.",
    },
    suggestedCharacteristics: {
      personality: [
        "I'm always polite and respectful.",
        "I'm haunted by memories of war. I can't get the images of violence out of my mind.",
        "I've lost too many friends, and I'm slow to make new ones.",
        "I'm full of inspiring and cautionary tales from my military experience.",
      ],
      ideals: [
        "Greater Good. Our lot is to lay down our lives in defense of others.",
        "Responsibility. I do what I must and obey just authority.",
        "Independence. When people follow orders blindly, they embrace a kind of tyranny.",
        "Might. In life as in war, the stronger force wins.",
      ],
      bonds: [
        "I would still lay down my life for the people I served with.",
        "Someone saved my life on the battlefield. To this day, I will never leave a friend behind.",
        "My honor is my life.",
        "I'll never forget the crushing defeat my company suffered or the enemies who dealt it.",
      ],
      flaws: [
        "The monstrous enemy we faced in battle still leaves me quivering with fear.",
        "I have little respect for anyone who is not a proven warrior.",
        "I made a terrible mistake in battle that cost many lives—and I would do anything to keep that mistake secret.",
        "My hatred of my enemies is blind and unreasoning.",
      ],
    },
  },
];

export function BackgroundSelectionStep({
  data,
  onUpdate,
}: StepComponentProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBackground, setSelectedBackground] =
    useState<Background | null>(data.background);

  const filteredBackgrounds = AVAILABLE_BACKGROUNDS.filter(
    (bg) =>
      bg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bg.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bg.skillProficiencies.some((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const handleBackgroundSelect = (background: Background) => {
    setSelectedBackground(background);

    onUpdate({
      background,
      // Add background equipment to starting equipment
      startingEquipment: [
        ...data.startingEquipment.filter(
          (item) =>
            !data.background?.equipment.some(
              (bgItem) => bgItem.item_id === item.item_id
            )
        ),
        ...background.equipment,
      ],
      // Add background languages
      languages: [
        ...new Set([
          ...data.languages,
          ...background.languages.filter((lang) => lang),
        ]),
      ],
    });
  };

  const getBackgroundIcon = (backgroundName: string) => {
    switch (backgroundName.toLowerCase()) {
      case "acolyte":
        return <Book className="h-5 w-5" />;
      case "criminal":
        return <Users className="h-5 w-5" />;
      case "folk hero":
        return <Hammer className="h-5 w-5" />;
      case "noble":
        return <Crown className="h-5 w-5" />;
      case "sage":
        return <Book className="h-5 w-5" />;
      case "soldier":
        return <Users className="h-5 w-5" />;
      default:
        return <Book className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search backgrounds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Background Selection */}
      <div className="grid gap-4">
        {filteredBackgrounds.map((background) => (
          <Card
            key={background.id}
            className={`cursor-pointer transition-colors hover:bg-muted/50 ${
              selectedBackground?.id === background.id
                ? "ring-2 ring-primary"
                : ""
            }`}
            onClick={() => handleBackgroundSelect(background)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getBackgroundIcon(background.name)}
                <span>{background.name}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {background.description}
              </p>

              <div className="space-y-4">
                {/* Skill Proficiencies */}
                <div>
                  <h4 className="font-medium mb-2">Skill Proficiencies</h4>
                  <div className="flex gap-1 flex-wrap">
                    {background.skillProficiencies.map((skill) => (
                      <Badge
                        key={skill}
                        variant="secondary"
                        className="text-xs"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Languages */}
                {background.languages.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Languages</h4>
                    <div className="flex gap-1 flex-wrap">
                      {background.languages.map((lang, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment */}
                <div>
                  <h4 className="font-medium mb-2">Starting Equipment</h4>
                  <div className="text-sm space-y-1">
                    {background.equipment.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.name}</span>
                        {item.quantity > 1 && (
                          <Badge variant="outline" className="text-xs">
                            {item.quantity}x
                          </Badge>
                        )}
                      </div>
                    ))}
                    {background.equipment.length > 3 && (
                      <div className="text-muted-foreground text-xs">
                        ...and {background.equipment.length - 3} more items
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Feature */}
                <div>
                  <h4 className="font-medium mb-2">Background Feature</h4>
                  <div className="text-sm">
                    <span className="font-medium">
                      {background.feature.name}:
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {background.feature.description}
                    </span>
                  </div>
                </div>

                {/* Expanded details for selected background */}
                {selectedBackground?.id === background.id && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-medium">Suggested Characteristics</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <h5 className="font-medium mb-2">
                            Personality Traits
                          </h5>
                          <ScrollArea className="h-20">
                            <ul className="space-y-1 text-muted-foreground">
                              {background.suggestedCharacteristics.personality
                                .slice(0, 2)
                                .map((trait, index) => (
                                  <li key={index} className="text-xs">
                                    • {trait}
                                  </li>
                                ))}
                            </ul>
                          </ScrollArea>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Ideals</h5>
                          <ScrollArea className="h-20">
                            <ul className="space-y-1 text-muted-foreground">
                              {background.suggestedCharacteristics.ideals
                                .slice(0, 2)
                                .map((ideal, index) => (
                                  <li key={index} className="text-xs">
                                    • {ideal}
                                  </li>
                                ))}
                            </ul>
                          </ScrollArea>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Bonds</h5>
                          <ScrollArea className="h-20">
                            <ul className="space-y-1 text-muted-foreground">
                              {background.suggestedCharacteristics.bonds
                                .slice(0, 2)
                                .map((bond, index) => (
                                  <li key={index} className="text-xs">
                                    • {bond}
                                  </li>
                                ))}
                            </ul>
                          </ScrollArea>
                        </div>

                        <div>
                          <h5 className="font-medium mb-2">Flaws</h5>
                          <ScrollArea className="h-20">
                            <ul className="space-y-1 text-muted-foreground">
                              {background.suggestedCharacteristics.flaws
                                .slice(0, 2)
                                .map((flaw, index) => (
                                  <li key={index} className="text-xs">
                                    • {flaw}
                                  </li>
                                ))}
                            </ul>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedBackground && (
        <Card>
          <CardHeader>
            <CardTitle>Background Selection Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm">
                  Background: {selectedBackground.name}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Skill proficiencies, equipment, and background feature have been
                applied to your character.
              </div>
              <div className="text-sm text-muted-foreground">
                You can customize your character's personality traits, ideals,
                bonds, and flaws based on the suggestions above.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
