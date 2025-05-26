// src/components/character/types.ts
import { Character } from "@/lib/types";

export interface CharacterComponentProps {
  character: Character;
  campaignId: string;
  userId: string;
  isReadOnly?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<boolean>;
}

export interface CharacterActionProps extends CharacterComponentProps {
  onRollDice?: (type: string, formula: string) => void;
  onUpdateHP?: (change: number, isTemp?: boolean) => Promise<boolean>;
  onAddCondition?: (condition: string) => Promise<boolean>;
  onRemoveCondition?: (condition: string) => Promise<boolean>;
}

export interface SkillInfo {
  name: string;
  attribute: keyof Character["attributes"];
  modifier: number;
  proficient: boolean;
  expertise: boolean;
  total: number;
}

export interface AttributeInfo {
  name: string;
  value: number;
  modifier: number;
  savingThrow: number;
  proficient: boolean;
}

// Editing state management
export interface EditingState {
  isEditing: boolean;
  editingField: string | null;
  hasChanges: boolean;
}

// Component-specific props
export interface CharacterHeaderProps extends CharacterComponentProps {
  isEditing?: boolean;
  onStartEditing?: () => void;
  onStopEditing?: () => void;
}

export interface CharacterAttributesProps extends CharacterComponentProps {
  onRollDice?: (type: string, formula: string) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export interface CharacterDefensesProps extends CharacterComponentProps {
  onUpdateHP?: (change: number, isTemp?: boolean) => Promise<boolean>;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export interface CharacterSkillsProps extends CharacterComponentProps {
  onRollDice?: (type: string, formula: string) => void;
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export interface CharacterFeaturesProps extends CharacterComponentProps {
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export interface CharacterInventoryProps extends CharacterComponentProps {
  isEditing?: boolean;
  onStartEditing?: () => void;
}

export interface CharacterConditionsProps extends CharacterComponentProps {
  onAddCondition?: (condition: string) => Promise<boolean>;
  onRemoveCondition?: (condition: string) => Promise<boolean>;
}

export interface CharacterActionsProps extends CharacterComponentProps {
  onRollDice?: (type: string, formula: string) => void;
  onUpdateHP?: (change: number, isTemp?: boolean) => Promise<boolean>;
  onAddCondition?: (condition: string) => Promise<boolean>;
  onRemoveCondition?: (condition: string) => Promise<boolean>;
}
