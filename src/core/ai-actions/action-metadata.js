/**
 * Metadata for available AI actions
 * This file defines the available AI actions and their properties
 */

import { getAllProcessors } from './index';

/**
 * Get all available AI actions
 * @returns {Array} Array of action objects
 */
export const getAllActions = () => {
  return getAllProcessors();
};

/**
 * Get an action by its ID
 * @param {string} actionId - The ID of the action to retrieve
 * @returns {Object|null} The action object or null if not found
 */
export const getActionById = (actionId) => {
  return getAllActions().find(action => action.id === actionId) || null;
};

/**
 * Get the component name for an action
 * @param {string} actionId - The ID of the action
 * @returns {string|null} The component name or null if not found
 */
export const getComponentName = (actionId) => {
  const action = getActionById(actionId);
  return action ? action.componentName || `${action.name}Renderer` : null;
};

/**
 * Get the display name for an action
 * @param {string} actionId - The ID of the action
 * @returns {string} The display name or the ID if not found
 */
export const getActionName = (actionId) => {
  const action = getActionById(actionId);
  return action ? action.name : actionId;
};
