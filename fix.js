const fs = require('fs');
const f = 'h:\\learn-quran-kids-1\\src\\pages\\KidsGames.tsx';
let c = fs.readFileSync(f, 'utf8');

// Fix 1: When time expires during play - navigate to home instead of PIN
const old1 = 'if (justExpired || progress.playExpired) {\n              toast({ title: "انتهى وقت اللعب ⏰", description: "لقد استنفدت وقت اللعب المخصص لك. يلزم رمز ولي الأمر للخروج.", variant: "destructive" });\n              setPinAction("exit");\n            }';
const new1 = 'if (justExpired || progress.playExpired) {\n              toast({ title: "انتهى وقت اللعب ⏰", description: "تم العودة إلى صفحة القرآن", variant: "destructive" });\n              navigate("/", { replace: true });\n              return;\n            }';

if (c.includes(old1)) {
  c = c.replace(old1, new1);
  console.log('Fix 1 applied');
} else {
  console.log('Fix 1 NOT found');
}

// Fix 2: Initial check - navigate to home instead of PIN
const old2 = 'if (!initialCheck.allowed || getProgress().playExpired) {\n        toast({ title: "انتهى وقت اللعب ⏰", description: initialCheck.reason || "لقد استنفدت وقت اللعب. يلزم رمز ولي الأمر للخروج.", variant: "destructive" });\n        setPinAction("exit");\n    }';
const new2 = 'if (!initialCheck.allowed || getProgress().playExpired) {\n        toast({ title: "انتهى وقت اللعب ⏰", description: "تم العودة إلى صفحة القرآن", variant: "destructive" });\n        navigate("/", { replace: true });\n        return;\n    }';

if (c.includes(old2)) {
  c = c.replace(old2, new2);
  console.log('Fix 2 applied');
} else {
  console.log('Fix 2 NOT found');
}

fs.writeFileSync(f, c, 'utf8');
console.log('Done');
