/**
 * Centralized Type Definitions - CONSOLIDADO
 * Problemas resolvidos:
 * 1. ✅ Tipos duplicados consolidados
 * 2. ✅ TypeScript types consistentes
 * 3. ✅ Proper interfaces para todas as entidades
 * 4. ✅ WebSocket event types
 * 5. ✅ Combat system types
 */

// ===== BASE TYPES =====
export type ObjectId = string;

export interface BaseEntity {
  _id: ObjectId;
  created_at: string;
  updated_at?: string;
}

// ===== USER TYPES =====
export interface User extends BaseEntity {
  username: string;
  email: string;
  is_active: boolean;
  avatar_url?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  notifications: NotificationSettings;
  dice_settings: DiceSettings;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  combat_updates: boolean;
  character_updates: boolean;
}

export interface DiceSettings {
  auto_roll: boolean;
  show_formula: boolean;
  animation: boolean;
}

// ===== AUTH TYPES =====
export interface AuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// ===== CAMPAIGN TYPES =====
export interface Campaign extends BaseEntity {
  name: string;
  description?: string;
  owner_id: ObjectId;
  players: ObjectId[];
  settings: CampaignSettings;
  is_active: boolean;
  image_url?: string;
}

export interface CampaignListItem {
  _id: ObjectId;
  name: string;
  description?: string;
  owner_id: ObjectId;
  players: ObjectId[];
  is_active: boolean;
  created_at: string;
}

export interface CampaignSettings {
  allow_player_character_creation: boolean;
  allow_dice_rolling: boolean;
  auto_save_interval: number;
  max_players: number;
  combat_settings: CombatSettings;
}

export interface CombatSettings {
  auto_roll_initiative: boolean;
  show_enemy_hp: boolean;
  allow_player_initiative: boolean;
  turn_timer: number;
}

// ===== CHARACTER TYPES =====
export interface Character extends BaseEntity {
  name: string;
  class: string;
  level: number;
  race: string;
  background?: string;
  campaign_id: ObjectId;
  owner_id: ObjectId;

  // Ability Scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // HP and AC
  hit_points_max: number;
  hit_points_current: number;
  hit_points_temp: number;
  armor_class: number;

  // Proficiencies
  proficiency_bonus: number;
  skills: SkillProficiency[];
  saving_throw_proficiencies: string[];

  // Combat Stats
  speed: number;
  initiative_bonus: number;

  // Features and Equipment
  features: CharacterFeature[];
  spells: CharacterSpell[];
  inventory: InventoryItem[];

  // Status
  conditions: string[];
  notes?: string;

  // Display
  avatar_url?: string;
  color?: string;
}

export interface CharacterListItem {
  _id: ObjectId;
  name: string;
  class: string;
  level: number;
  race: string;
  campaign_id: ObjectId;
  owner_id: ObjectId;
  avatar_url?: string;
}

export interface SkillProficiency {
  skill: string;
  proficient: boolean;
  expertise: boolean;
}

export interface CharacterFeature {
  name: string;
  description: string;
  source: string;
  uses_max?: number;
  uses_current?: number;
}

export interface CharacterSpell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  duration: string;
  description: string;
  prepared: boolean;
}

export interface InventoryItem {
  name: string;
  description?: string;
  quantity: number;
  weight: number;
  value: number;
  type: string;
  properties?: string[];
}

// ===== NPC TYPES =====
export interface NPC extends BaseEntity {
  name: string;
  type: string;
  subtype?: string;
  size: string;
  alignment: string;
  campaign_id: ObjectId;

  // Stats
  armor_class: number;
  hit_points_max: number;
  hit_points_current: number;
  speed: Record<string, number>;

  // Ability Scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Combat
  challenge_rating: string;
  proficiency_bonus: number;
  saving_throws?: Record<string, number>;
  skills?: Record<string, number>;
  damage_resistances?: string[];
  damage_immunities?: string[];
  condition_immunities?: string[];
  senses?: string[];
  languages?: string[];

  // Actions
  actions: NPCAction[];
  legendary_actions?: NPCAction[];
  reactions?: NPCAction[];

  // Description
  description?: string;
  image_url?: string;

  // Status
  conditions: string[];
  notes?: string;
}

export interface NPCListItem {
  _id: ObjectId;
  name: string;
  type: string;
  challenge_rating: string;
  campaign_id: ObjectId;
  image_url?: string;
}

export interface NPCAction {
  name: string;
  description: string;
  attack_bonus?: number;
  damage?: string;
  save_dc?: number;
  save_ability?: string;
  type: "action" | "legendary" | "reaction" | "lair";
  recharge?: string;
}

// ===== COMBAT TYPES =====
export interface Combat extends BaseEntity {
  campaign_id: ObjectId;
  encounter_id?: ObjectId;
  participants: CombatParticipant[];
  round: number;
  turn: number;
  current_participant_id?: ObjectId;
  status: "setup" | "active" | "ended";
  settings: CombatSettings;
}

export interface CombatParticipant {
  _id: ObjectId;
  entity_id: ObjectId;
  entity_type: "character" | "npc";
  name: string;
  initiative: number;
  hit_points_max: number;
  hit_points_current: number;
  hit_points_temp: number;
  armor_class: number;
  conditions: ConditionEffect[];
  actions_taken: CombatAction[];
  is_visible: boolean;
  position?: Position;
}

export interface ConditionEffect {
  id: string;
  name: string;
  description?: string;
  duration: number;
  source: string;
  effects: Record<string, any>;
  created_at: string;
}

export interface CombatAction {
  id: string;
  name: string;
  description?: string;
  type: "action" | "bonus_action" | "reaction" | "movement";
  timestamp: string;
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

// ===== ENCOUNTER TYPES =====
export interface Encounter extends BaseEntity {
  name: string;
  description?: string;
  campaign_id: ObjectId;
  difficulty: "easy" | "medium" | "hard" | "deadly";
  participants: EncounterParticipant[];
  environment?: EncounterEnvironment;
  triggers?: EncounterTrigger[];
}

export interface EncounterParticipant {
  entity_id: ObjectId;
  entity_type: "character" | "npc";
  quantity: number;
  position?: Position;
  hidden: boolean;
}

export interface EncounterEnvironment {
  terrain: string;
  weather?: string;
  lighting: string;
  temperature?: string;
  special_conditions?: string[];
}

export interface EncounterTrigger {
  name: string;
  condition: string;
  action: string;
  parameters: Record<string, any>;
}

// ===== COMPENDIUM TYPES =====
export interface Spell {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string[];
  duration: string;
  description: string;
  higher_levels?: string;
  classes: string[];
  source: string;
}

export interface Item {
  name: string;
  type: string;
  subtype?: string;
  rarity: string;
  requires_attunement: boolean;
  description: string;
  properties?: string[];
  damage?: string;
  weight: number;
  value: number;
  source: string;
}

export interface Monster {
  name: string;
  type: string;
  subtype?: string;
  size: string;
  alignment: string;
  armor_class: number;
  hit_points: number;
  hit_dice: string;
  speed: Record<string, number>;
  ability_scores: Record<string, number>;
  challenge_rating: string;
  proficiency_bonus: number;
  actions: NPCAction[];
  source: string;
}

// ===== WEBSOCKET TYPES =====
export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

export interface LockEvent {
  resource_id: string;
  resource_type: string;
  action: "acquire" | "release" | "check";
  duration?: number;
}

export interface DiceRollEvent {
  formula: string;
  result: DiceRollResult;
  character_id?: ObjectId;
  context?: string;
}

export interface DiceRollResult {
  total: number;
  rolls: DiceRoll[];
  formula: string;
  breakdown: string;
}

export interface DiceRoll {
  sides: number;
  result: number;
  critical?: boolean;
}

// ===== API RESPONSE TYPES =====
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
  detail?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ===== ERROR TYPES =====
export interface ErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationError {
  type: "validation_error";
  details: ErrorDetail[];
}

// ===== NOTIFICATION TYPES =====
export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  style?: "primary" | "secondary" | "destructive";
}

// ===== SEARCH AND FILTER TYPES =====
export interface SearchOptions {
  query?: string;
  filters?: Record<string, any>;
  sort?: SortOption;
  page?: number;
  per_page?: number;
}

export interface SortOption {
  field: string;
  direction: "asc" | "desc";
}

export interface FilterOption {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "in"
    | "nin"
    | "contains";
  value: any;
}

// ===== UTILITY TYPES =====
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// ===== FORM TYPES =====
export interface FormField {
  name: string;
  label: string;
  type:
    | "text"
    | "number"
    | "email"
    | "password"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio";
  required?: boolean;
  placeholder?: string;
  options?: FormOption[];
  validation?: ValidationRule[];
}

export interface FormOption {
  label: string;
  value: any;
}

export interface ValidationRule {
  type: "required" | "email" | "min" | "max" | "pattern";
  value?: any;
  message: string;
}

// ===== EXPORT ALL TYPES =====
export type {
  // Re-export common types for convenience
  ObjectId,
  BaseEntity,
  User,
  Campaign,
  Character,
  NPC,
  Combat,
  Spell,
  Item,
  Monster,
  WebSocketMessage,
  ApiResponse,
  Notification,
};
