const { handleLoremIpsum } = require("/root/services/lorem-ipsum.js");
const PORT = 8080;
const CONTENT = '/root/automaton/content';
const API_KEYS = '/root/automaton/api-keys.json';
const DATA_DIR = '/root/automaton/data';
const DEEPSEEK_ENDPOINT = process.env.DEEPSEEK_ENDPOINT || 'https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions';
const STRIPE_SK = process.env.STRIPE_SK || '';
const STRIPE_PK = process.env.STRIPE_PK || 'pk_test_YOUR_KEY';