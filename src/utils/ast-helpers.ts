/**
 * AST helper utilities for traversing and querying TypeScript/JSX ASTs.
 * Uses @typescript-eslint/typescript-estree AST format.
 */

import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/typescript-estree';
import { ASTVisitor } from '../types';

/**
 * Walk the AST tree calling visitor functions for matching node types.
 */
export function walkAST(node: TSESTree.Node, visitor: ASTVisitor): void {
  if (!node || typeof node !== 'object') return;

  const handler = visitor[node.type];
  if (handler) {
    handler(node);
  }

  // Recurse into child nodes
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const child = (node as any)[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object' && typeof item.type === 'string') {
          walkAST(item as TSESTree.Node, visitor);
        }
      }
    } else if (child && typeof child === 'object' && typeof child.type === 'string') {
      walkAST(child as TSESTree.Node, visitor);
    }
  }
}

/**
 * Check if a node is a React function component.
 * Detects: function Foo() { return <JSX /> } or const Foo = () => <JSX />
 */
export function isReactComponent(node: TSESTree.Node): boolean {
  if (
    node.type === AST_NODE_TYPES.FunctionDeclaration &&
    node.id &&
    /^[A-Z]/.test(node.id.name)
  ) {
    return containsJSX(node);
  }

  if (node.type === AST_NODE_TYPES.VariableDeclarator) {
    const id = node.id;
    if (id.type === AST_NODE_TYPES.Identifier && /^[A-Z]/.test(id.name)) {
      const init = node.init;
      if (
        init &&
        (init.type === AST_NODE_TYPES.ArrowFunctionExpression ||
          init.type === AST_NODE_TYPES.FunctionExpression)
      ) {
        return containsJSX(init);
      }
    }
  }

  return false;
}

/**
 * Check if a subtree contains any JSX elements.
 */
export function containsJSX(node: TSESTree.Node): boolean {
  let found = false;
  walkAST(node, {
    [AST_NODE_TYPES.JSXElement]: () => { found = true; },
    [AST_NODE_TYPES.JSXFragment]: () => { found = true; },
  });
  return found;
}

/**
 * Check if a node is a call to a specific React hook.
 */
export function isHookCall(node: TSESTree.Node, hookName: string): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;

  const callee = node.callee;

  // Direct call: useEffect(...)
  if (callee.type === AST_NODE_TYPES.Identifier && callee.name === hookName) {
    return true;
  }

  // Member call: React.useEffect(...)
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier &&
    callee.property.name === hookName
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a node is a call to any React hook (starts with "use").
 */
export function isAnyHookCall(node: TSESTree.Node): boolean {
  if (node.type !== AST_NODE_TYPES.CallExpression) return false;

  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return /^use[A-Z]/.test(callee.name);
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return /^use[A-Z]/.test(callee.property.name);
  }
  return false;
}

/**
 * Get the name of a hook call.
 */
export function getHookName(node: TSESTree.CallExpression): string | null {
  const callee = node.callee;
  if (callee.type === AST_NODE_TYPES.Identifier) {
    return callee.name;
  }
  if (
    callee.type === AST_NODE_TYPES.MemberExpression &&
    callee.property.type === AST_NODE_TYPES.Identifier
  ) {
    return callee.property.name;
  }
  return null;
}

/**
 * Get all JSX attributes from a JSX opening element.
 */
export function getJSXAttributes(
  node: TSESTree.JSXOpeningElement
): TSESTree.JSXAttribute[] {
  return node.attributes.filter(
    (attr): attr is TSESTree.JSXAttribute =>
      attr.type === AST_NODE_TYPES.JSXAttribute
  );
}

/**
 * Get the name of a JSX element.
 */
export function getJSXElementName(
  node: TSESTree.JSXOpeningElement | TSESTree.JSXClosingElement
): string {
  const name = node.name;
  if (name.type === AST_NODE_TYPES.JSXIdentifier) {
    return name.name;
  }
  if (name.type === AST_NODE_TYPES.JSXMemberExpression) {
    return getJSXMemberName(name);
  }
  return '';
}

function getJSXMemberName(node: TSESTree.JSXMemberExpression): string {
  const obj =
    node.object.type === AST_NODE_TYPES.JSXIdentifier
      ? node.object.name
      : getJSXMemberName(node.object as TSESTree.JSXMemberExpression);
  return `${obj}.${node.property.name}`;
}

/**
 * Find all import declarations for a specific module.
 */
export function findImports(
  ast: TSESTree.Program,
  moduleName: string
): TSESTree.ImportDeclaration[] {
  return ast.body.filter(
    (node): node is TSESTree.ImportDeclaration =>
      node.type === AST_NODE_TYPES.ImportDeclaration &&
      node.source.value === moduleName
  );
}

/**
 * Get the JSX nesting depth at a given node.
 */
export function getJSXDepth(node: TSESTree.Node): number {
  let depth = 0;
  let current: TSESTree.Node | undefined = node;
  while (current) {
    if (
      current.type === AST_NODE_TYPES.JSXElement ||
      current.type === AST_NODE_TYPES.JSXFragment
    ) {
      depth++;
    }
    current = (current as any).parent;
  }
  return depth;
}

/**
 * Count lines in a function/component body.
 */
export function getNodeLineCount(node: TSESTree.Node): number {
  if (!node.loc) return 0;
  return node.loc.end.line - node.loc.start.line + 1;
}

/**
 * Get the string value of a JSX attribute.
 */
export function getJSXAttributeValue(
  attr: TSESTree.JSXAttribute
): string | null {
  if (!attr.value) return null;
  if (attr.value.type === AST_NODE_TYPES.Literal) {
    return String(attr.value.value);
  }
  return null;
}

/**
 * Check if a JSX attribute name matches.
 */
export function hasJSXAttribute(
  element: TSESTree.JSXOpeningElement,
  attrName: string
): boolean {
  return getJSXAttributes(element).some(
    (attr) =>
      attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
      attr.name.name === attrName
  );
}

/**
 * Get a specific JSX attribute by name.
 */
export function getJSXAttribute(
  element: TSESTree.JSXOpeningElement,
  attrName: string
): TSESTree.JSXAttribute | undefined {
  return getJSXAttributes(element).find(
    (attr) =>
      attr.name.type === AST_NODE_TYPES.JSXIdentifier &&
      attr.name.name === attrName
  );
}
