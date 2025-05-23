// lib/types.ts
import { ReactNode } from "react";

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  role: "player" | "dm";
  created_at: string;
  last_login?: string;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  role: string;
}

// Character types
export interface Attributes {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface HitPoints {
  current: number;
  max: number;
}

export interface SpellSlot {
  used: number;
  total: number;
}

export interface Spellcasting {
  ability: string;
  spell_slots: Record<string, SpellSlot>;
  prepared_spells: string[];
}

export interface InventoryItem {
  item_id: string;
  name: string;
  quantity: number;
  equipped: boolean;
  description?: string;
  weight?: number;
  value?: number;
}

export interface Proficiency {
  name: string;
  type: "skill" | "saving_throw" | "tool" | "weapon" | "armor" | "language";
  expertise: boolean;
}

export interface Feature {
  name: string;
  description: string;
}

export interface Character {
  _id: string;
  name: string;
  owner_id: string;
  campaign_id: string;
  race: string;
  class: string;
  level: number;
  attributes: Attributes;
  hp: HitPoints;
  temporary_hp: number;
  armor_class: number;
  speed: number;
  initiative_bonus: number;
  spellcasting?: Spellcasting;
  inventory: InventoryItem[];
  proficiencies: Proficiency[];
  features: Feature[];
  background?: string;
  alignment?: string;
  experience_points: number;
  inspiration: boolean;
  conditions: string[];
  created_at: string;
  updated_at: string;
}

export interface CharacterListItem {
  _id: string;
  name: string;
  owner_id: string;
  level: number;
  race: string;
  class: string;
  hp: HitPoints;
}

// NPC types
export interface NPCAction {
  name: string;
  description: string;
  attack_bonus?: number;
  damage?: string;
  damage_type?: string;
}

export interface NPCStats {
  ac: number;
  hp: HitPoints;
  speed: number;
  attributes: Attributes;
  saving_throws?: Record<string, number>;
  skills?: Record<string, number>;
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  senses?: string;
  languages: string[];
  challenge_rating: string;
}

export interface NPC {
  _id: string;
  name: string;
  source: "custom" | "compendium";
  compendium_id?: string;
  campaign_id: string;
  stats: NPCStats;
  actions: NPCAction[];
  legendary_actions: NPCAction[];
  reactions: NPCAction[];
  features: Feature[];
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface NPCListItem {
  _id: string;
  name: string;
  source: "custom" | "compendium";
  challenge_rating: string;
  type: string;
}

// Campaign types
export interface Trap {
  name: string;
  description: string;
  dc: number;
  damage: string;
  triggered: boolean;
}

export interface NPCReference {
  npc_id: string;
  quantity: number;
  hp_override?: number;
  initiative_override?: number;
  hidden: boolean;
}

export interface Image {
  id: string;
  url: string;
  name: string;
  description?: string;
  tags: string[];
  is_map: boolean;
  grid_enabled: boolean;
  grid_size?: number;
}

export interface Encounter {
  id: string;
  name: string;
  description?: string;
  npcs: NPCReference[];
  traps: Trap[];
  map_image_id?: string;
  notes?: string;
}

export interface Campaign {
  _id: string;
  name: string;
  description?: string;
  dm_id: string;
  players: string[];
  active_encounter?: string;
  encounters: Encounter[];
  images: Image[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignListItem {
  _id: string;
  name: string;
  description?: string;
  dm_id: string;
  player_count: number;
  active: boolean;
  created_at: string;
}

// Combat types
export interface InitiativeEntry {
  id: string;
  type: "character" | "npc";
  initiative: number;
  has_acted: boolean;
  name?: string;
}

export interface ConditionDuration {
  type: "rounds" | "minutes" | "hours";
  value: number;
}

export interface ConditionApplication {
  round: number;
  turn: number;
}

export interface ConditionEffect {
  target_id: string;
  target_type: "character" | "npc";
  condition: string;
  duration: ConditionDuration;
  applied_at: ConditionApplication;
  notes?: string;
}

export interface DiceRoll {
  roll: string;
  result: number;
}

export interface CombatEvent {
  id: string;
  round: number;
  turn: number;
  actor_id: string;
  actor_type: "character" | "npc" | "dm";
  event_type:
    | "attack"
    | "damage"
    | "spell"
    | "heal"
    | "condition"
    | "movement"
    | "other";
  target_id?: string;
  target_type?: "character" | "npc";
  description: string;
  rolls: DiceRoll[];
  timestamp: string;
}

export interface Combat {
  _id: string;
  campaign_id: string;
  encounter_id?: string;
  status: "active" | "completed" | "paused";
  round: number;
  initiative_order: InitiativeEntry[];
  current_turn: number;
  conditions: ConditionEffect[];
  events: CombatEvent[];
  started_at: string;
  updated_at: string;
  ended_at?: string;
}

// WebSocket message types
export interface WSMessage {
  type: string;
  action: string;
  timestamp?: string;
}

export interface CharacterEvent extends WSMessage {
  type: "character";
  action: "update" | "roll" | "hp_change";
  character_id: string;
  data: Record<string, any>;
}

export interface RollEvent extends WSMessage {
  type: "roll";
  action:
    | "ability"
    | "skill"
    | "saving_throw"
    | "attack"
    | "damage"
    | "initiative"
    | "custom";
  character_id?: string;
  npc_id?: string;
  formula: string;
  modifier: number;
  advantage?: boolean;
  disadvantage?: boolean;
}

export interface CombatEvent extends WSMessage {
  type: "combat";
  action:
    | "start"
    | "roll_initiative"
    | "next_turn"
    | "add_condition"
    | "remove_condition"
    | "end";
  combat_id?: string;
  data: Record<string, any>;
}

export interface LockEvent extends WSMessage {
  type: "lock";
  action: "acquire" | "release" | "heartbeat" | "status";
  resource_id: string;
  resource_type: string;
  duration?: number;
}

export interface ImageEvent extends WSMessage {
  type: "image";
  action: "share" | "hide" | "reveal" | "move_token";
  image_id: string;
  data: Record<string, any>;
}

export interface SpellEvent extends WSMessage {
  type: "spell";
  action: "prepare" | "cast" | "reset_slots" | "unprepare";
  character_id: string;
  data: Record<string, any>;
}

export interface SystemEvent extends WSMessage {
  type: "system";
  action: "connected" | "disconnected" | "error" | "notification";
  message: string;
  details?: Record<string, any>;
}

// Compendium types
export interface Spell {
  _id: string;
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes: string[];
  source: string;
}

export interface Item {
  _id: string;
  name: string;
  type: string;
  rarity: string;
  requires_attunement: boolean;
  description: string;
  weight?: number;
  value?: number;
  properties: string[];
  source: string;
}

export interface MonsterTemplate {
  _id: string;
  name: string;
  size: string;
  type: string;
  alignment: string;
  armor_class: number;
  armor_desc?: string;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, number>;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  saving_throws?: Record<string, number>;
  skills?: Record<string, number>;
  damage_vulnerabilities: string[];
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  senses: string;
  languages: string;
  challenge_rating: string;
  traits: Record<string, string>[];
  actions: Record<string, string>[];
  legendary_actions: Record<string, string>[];
  source: string;
}

// Lock types
export interface Lock {
  resource_id: string;
  resource_type: string;
  locked_by: string;
  timestamp: string;
  expires_at: string;
}

export interface SessionLock {
  campaign_id: string;
  resource_type: string;
  locked_by: string;
  player_turn?: string;
  timestamp: string;
  expires_at: string;
}

// Component props
export interface LayoutProps {
  children: ReactNode;
}

export interface WithChildrenProps {
  children: ReactNode;
}

export interface WithClassNameProps {
  className?: string;
}
