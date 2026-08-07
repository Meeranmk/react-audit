/**
 * Rule: no-hardcoded-secrets
 * Flags hardcoded API keys, tokens, passwords, and secrets in source code.
 */

import { AST_NODE_TYPES } from '@typescript-eslint/typescript-estree';
import { RuleModule } from '../../types';

// Patterns that suggest a hardcoded secret
const SECRET_PATTERNS = [
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"]/i,
  /(?:secret[_-]?key|secretkey)\s*[:=]\s*['"]/i,
  /(?:access[_-]?token|accesstoken)\s*[:=]\s*['"]/i,
  /(?:auth[_-]?token|authtoken)\s*[:=]\s*['"]/i,
  /(?:private[_-]?key|privatekey)\s*[:=]\s*['"]/i,
  /(?:password|passwd|pwd)\s*[:=]\s*['"]/i,
];

// Known secret prefixes in values
const SECRET_VALUE_PATTERNS = [
  /^sk[-_]/i,       // Stripe secret keys
  /^pk[-_]/i,       // Stripe publishable keys (can warn)
  /^ghp_/,          // GitHub tokens
  /^gho_/,          // GitHub OAuth tokens
  /^github_pat_/,   // GitHub PATs
  /^xoxb-/,         // Slack bot tokens
  /^xoxp-/,         // Slack user tokens
  /^AKIA/,          // AWS access key IDs
  /^eyJ[A-Za-z0-9]/,// JWT tokens
];

const rule: RuleModule = {
  meta: {
    name: 'no-hardcoded-secrets',
    category: 'security',
    severity: 'error',
    description: 'Do not hardcode secrets, API keys, or tokens in source code.',
    docs: 'Hardcoded secrets in source code can be leaked through version control. Use environment variables or a secrets manager instead.',
  },
  create(context) {
    return {
      [AST_NODE_TYPES.VariableDeclarator](node: any) {
        const id = node.id;
        const init = node.init;

        if (!id || !init) return;

        // Check variable name against secret patterns
        if (id.type === AST_NODE_TYPES.Identifier) {
          const name = id.name.toLowerCase();
          if (
            (name.includes('api_key') ||
              name.includes('apikey') ||
              name.includes('secret') ||
              name.includes('token') ||
              name.includes('password') ||
              name.includes('private_key') ||
              name.includes('privatekey')) &&
            init.type === AST_NODE_TYPES.Literal &&
            typeof init.value === 'string' &&
            init.value.length > 8
          ) {
            context.report({
              message: `Possible hardcoded secret in variable "${id.name}".`,
              line: node.loc?.start.line ?? 0,
              column: node.loc?.start.column ?? 0,
              suggestion: 'Use an environment variable: process.env.YOUR_SECRET_NAME',
            });
            return;
          }
        }

        // Check string literal values for known secret patterns
        if (
          init.type === AST_NODE_TYPES.Literal &&
          typeof init.value === 'string' &&
          init.value.length > 20
        ) {
          for (const pattern of SECRET_VALUE_PATTERNS) {
            if (pattern.test(init.value)) {
              context.report({
                message: `Possible hardcoded secret or token detected in string literal.`,
                line: init.loc?.start.line ?? 0,
                column: init.loc?.start.column ?? 0,
                suggestion: 'Move this value to an environment variable.',
              });
              return;
            }
          }
        }
      },
    };
  },
};

export default rule;
