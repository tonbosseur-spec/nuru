import fs from 'fs';
let content = fs.readFileSync('src/components/analysis/LinearRegression.tsx', 'utf8');
content = content.replace('{\\y_var}', '{y_var}').replace('{\\x_var}', '{x_var}');
fs.writeFileSync('src/components/analysis/LinearRegression.tsx', content);

let content2 = fs.readFileSync('src/components/analysis/HypothesisTests.tsx', 'utf8');
content2 = content2.replace('{\\target}', '{target}').replace('{\\group_var}', '{group_var}');
content2 = content2.replace('{\\target}', '{target}').replace('{\\group_var}', '{group_var}');
fs.writeFileSync('src/components/analysis/HypothesisTests.tsx', content2);

let content3 = fs.readFileSync('src/components/analysis/NormalityTests.tsx', 'utf8');
content3 = content3.replace('{\\tselectedVar}', '{selectedVar}');
fs.writeFileSync('src/components/analysis/NormalityTests.tsx', content3);
