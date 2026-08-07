/**
 * Central rule registry — imports and exports all available rules.
 */

import { RuleModule, RuleCategory } from '../types';

// Performance rules
import noArrayIndexKey from './performance/no-array-index-key';
import noInlineFunctionInJsx from './performance/no-inline-function-in-jsx';
import noInlineStyles from './performance/no-inline-styles';
import noObjectLiteralInJsx from './performance/no-object-literal-in-jsx';
import useMemoForExpensive from './performance/use-memo-for-expensive';
import noUnnecessaryRerenders from './performance/no-unnecessary-rerenders';

// State & Effects rules
import noMissingDeps from './state-effects/no-missing-deps';
import noDerivedState from './state-effects/no-derived-state';
import noEffectAsHandler from './state-effects/no-effect-as-handler';
import noStateInRef from './state-effects/no-state-in-ref';
import noSetStateInEffectLoop from './state-effects/no-set-state-in-effect-loop';
import noDirectMutation from './state-effects/no-direct-mutation';

// Architecture rules
import maxComponentLines from './architecture/max-component-lines';
import maxProps from './architecture/max-props';
import noBarrelImport from './architecture/no-barrel-import';
import noPropDrilling from './architecture/no-prop-drilling';
import oneComponentPerFile from './architecture/one-component-per-file';
import noDeeplyNestedJsx from './architecture/no-deeply-nested-jsx';

// Security rules
import noDangerousHtml from './security/no-dangerous-html';
import noTargetBlank from './security/no-target-blank';
import noEval from './security/no-eval';
import noUnescapedEntities from './security/no-unescaped-entities';
import noHardcodedSecrets from './security/no-hardcoded-secrets';

// Accessibility rules
import imgAltText from './accessibility/img-alt-text';
import clickEventsHaveKeyEvents from './accessibility/click-events-have-key-events';
import noAutofocus from './accessibility/no-autofocus';
import anchorHasContent from './accessibility/anchor-has-content';
import useSemanticElements from './accessibility/use-semantic-elements';

// Dead Code rules
import noUnusedImports from './dead-code/no-unused-imports';
import noUnusedVariables from './dead-code/no-unused-variables';
import noUnreachableCode from './dead-code/no-unreachable-code';
import noCommentedCode from './dead-code/no-commented-code';

const ALL_RULES: RuleModule[] = [
  // Performance
  noArrayIndexKey,
  noInlineFunctionInJsx,
  noInlineStyles,
  noObjectLiteralInJsx,
  useMemoForExpensive,
  noUnnecessaryRerenders,

  // State & Effects
  noMissingDeps,
  noDerivedState,
  noEffectAsHandler,
  noStateInRef,
  noSetStateInEffectLoop,
  noDirectMutation,

  // Architecture
  maxComponentLines,
  maxProps,
  noBarrelImport,
  noPropDrilling,
  oneComponentPerFile,
  noDeeplyNestedJsx,

  // Security
  noDangerousHtml,
  noTargetBlank,
  noEval,
  noUnescapedEntities,
  noHardcodedSecrets,

  // Accessibility
  imgAltText,
  clickEventsHaveKeyEvents,
  noAutofocus,
  anchorHasContent,
  useSemanticElements,

  // Dead Code
  noUnusedImports,
  noUnusedVariables,
  noUnreachableCode,
  noCommentedCode,
];

/**
 * Get all registered rules.
 */
export function getAllRules(): RuleModule[] {
  return ALL_RULES;
}

/**
 * Get rules filtered by category.
 */
export function getRulesByCategory(category: RuleCategory): RuleModule[] {
  return ALL_RULES.filter((rule) => rule.meta.category === category);
}

/**
 * Get a specific rule by name.
 */
export function getRule(name: string): RuleModule | undefined {
  return ALL_RULES.find((rule) => rule.meta.name === name);
}

/**
 * Get total count of rules.
 */
export function getRuleCount(): number {
  return ALL_RULES.length;
}
