/**
 * Postinstall script to create stub packages for React Native dependencies
 * These are needed because @tuya/tuya-panel-api requires these as peer dependencies,
 * but they are designed for React Native panels, not miniapps.
 */

const fs = require('fs');
const path = require('path');

const nodeModulesDir = path.join(__dirname, '..', 'node_modules');

// Helper function to create a stub package
function createStubPackage(name, version, packageJson, indexJs) {
  const stubDir = path.join(nodeModulesDir, name);
  const packageJsonPath = path.join(stubDir, 'package.json');
  const indexJsPath = path.join(stubDir, 'index.js');

  // Create directory if it doesn't exist
  if (!fs.existsSync(stubDir)) {
    fs.mkdirSync(stubDir, { recursive: true });
  }

  // Create package.json
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

  // Create index.js
  fs.writeFileSync(indexJsPath, indexJs);

  console.log(`✓ Created ${name} stub package`);
}

// 1. Create tuya-panel-kit stub
createStubPackage('tuya-panel-kit', '4.3.4', {
  name: 'tuya-panel-kit',
  version: '4.3.4',
  description: 'Placeholder package for TuYa miniapp - tuya-panel-kit is not needed in miniapp environment',
  main: 'index.js',
  license: 'MIT'
}, `/**
 * Placeholder package for tuya-panel-kit
 * This is a stub implementation for TuYa miniapp projects.
 * tuya-panel-kit is designed for React Native panels, not miniapps.
 */

module.exports = {
  TYSdk: {
    apiRequest: function() {
      console.warn('tuya-panel-kit is not available in miniapp environment. Use ty.* APIs instead.');
      return Promise.reject(new Error('tuya-panel-kit is not available in miniapp environment'));
    }
  }
};
`);

// 2. Create react-native stub
createStubPackage('react-native', '0.59.10', {
  name: 'react-native',
  version: '0.59.10',
  description: 'Placeholder package for TuYa miniapp - react-native is not needed in miniapp environment',
  main: 'index.js',
  license: 'MIT'
}, `/**
 * Placeholder package for react-native
 * This is a stub implementation for TuYa miniapp projects.
 * react-native is designed for React Native apps, not miniapps.
 */

// Stub for AsyncStorage (used in lamp/storage.ts)
const AsyncStorage = {
  getItem: function() {
    return Promise.reject(new Error('AsyncStorage is not available in miniapp. Use ty.getStorageSync instead.'));
  },
  setItem: function() {
    return Promise.reject(new Error('AsyncStorage is not available in miniapp. Use ty.setStorageSync instead.'));
  },
  removeItem: function() {
    return Promise.reject(new Error('AsyncStorage is not available in miniapp. Use ty.removeStorageSync instead.'));
  },
  clear: function() {
    return Promise.reject(new Error('AsyncStorage is not available in miniapp.'));
  }
};

// Stub for NativeModules (used in robot and lamp modules)
const NativeModules = {};

module.exports = {
  AsyncStorage,
  NativeModules
};
`);

// 3. Create lodash stub
createStubPackage('lodash', '4.17.21', {
  name: 'lodash',
  version: '4.17.21',
  description: 'Placeholder package for TuYa miniapp - lodash is not needed in miniapp environment',
  main: 'index.js',
  license: 'MIT'
}, `/**
 * Placeholder package for lodash
 * This is a minimal stub implementation for TuYa miniapp projects.
 * For full lodash functionality, install lodash separately if needed.
 */

// Minimal stub implementations for commonly used lodash functions
const stub = {
  isEmpty: function(value) {
    if (value == null) return true;
    if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  },
  isEqual: function(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  },
  get: function(object, path, defaultValue) {
    const keys = Array.isArray(path) ? path : path.split('.');
    let result = object;
    for (const key of keys) {
      if (result == null) return defaultValue;
      result = result[key];
    }
    return result !== undefined ? result : defaultValue;
  },
  cloneDeep: function(value) {
    return JSON.parse(JSON.stringify(value));
  },
  map: function(collection, iteratee) {
    if (Array.isArray(collection)) {
      return collection.map(iteratee);
    }
    return [];
  },
  padStart: function(string, length, chars) {
    string = String(string);
    while (string.length < length) {
      string = chars + string;
    }
    return string;
  }
};

module.exports = stub;
module.exports.default = stub;
`);

// 4. Create base64-js stub
createStubPackage('base64-js', '1.5.1', {
  name: 'base64-js',
  version: '1.5.1',
  description: 'Placeholder package for TuYa miniapp - base64-js is not needed in miniapp environment',
  main: 'index.js',
  license: 'MIT'
}, `/**
 * Placeholder package for base64-js
 * This is a stub implementation for TuYa miniapp projects.
 * For base64 encoding/decoding in miniapp, use built-in methods or install base64-js separately.
 */

// Minimal stub for base64 operations
// In miniapp, you can use Buffer or other built-in methods for base64 encoding
const stub = {
  toByteArray: function(base64) {
    // Stub implementation - returns empty array
    console.warn('base64-js.toByteArray is not available in miniapp. Use alternative base64 decoding methods.');
    return [];
  },
  fromByteArray: function(bytes) {
    // Stub implementation - returns empty string
    console.warn('base64-js.fromByteArray is not available in miniapp. Use alternative base64 encoding methods.');
    return '';
  }
};

module.exports = stub;
module.exports.default = stub;
`);

console.log('\n✓ All stub packages created successfully');

