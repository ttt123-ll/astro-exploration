// ESLint 9 扁平配置：前端 Vue 3 + 后端 Node.js
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

export default [
    // 忽略构建产物与依赖
    {
        ignores: [
            '**/node_modules/**',
            '**/dist/**',
            'client/public/assets/**',
            'docker-dist/**',
            'shots/**',
            'git-history.html'
        ]
    },

    // 通用 JS 规则
    js.configs.recommended,

    // ---------- 前端（Vue 3 + 浏览器环境） ----------
    ...pluginVue.configs['flat/recommended'],
    {
        files: ['client/**/*.{js,vue}'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser
            }
        },
        rules: {
            // 组件名允许多单词之外的常用写法
            'vue/multi-word-component-names': 'off',
            // 排版类规则交给 Prettier，避免与格式化工具冲突
            'vue/max-attributes-per-line': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'vue/html-self-closing': 'off',
            'vue/html-indent': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/attributes-order': 'off',
            'vue/first-attribute-linebreak': 'off',
            // 与业务相关的宽松设置
            'vue/no-v-html': 'off',
            'vue/require-default-prop': 'off',
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none'   // catch (e) 仅用于忽略错误时允许不写 e 以外的引用
            }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-console': 'off'
        }
    },

    // ---------- 后端（Node.js + CommonJS） ----------
    {
        files: ['server/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'commonjs',
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-console': 'off'
        }
    },

    // ---------- 工具脚本（Node.js ESM / CJS 混用） ----------
    {
        files: ['tools/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none'
            }],
            'no-empty': ['warn', { allowEmptyCatch: true }],
            'no-console': 'off'
        }
    }
];
