const fs = require('fs');
const path = 'c:\\Users\\SAN\\majorlogic-platform-v1\\apps\\search-ui\\src\\App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Phase 2
// Look for the specific block of closing tags before Sidebar
const target2 = '                  }))\n                </div>\n              </div>';
const replacement2 = '                  }))\n                </div>\n              )}\n            </div>';

if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    console.log('Phase 2 fixed');
} else {
    console.log('Phase 2 target not found');
}

// Fix Phase 4
const target4 = '                    ))}\n                  </div>\n                )}\n              </div>\n              </div>';
const replacement4 = '                    ))}\n                  </div>\n                </div>\n              </div>';

if (content.includes(target4)) {
    content = content.replace(target4, replacement4);
    console.log('Phase 4 fixed');
} else {
    console.log('Phase 4 target not found');
}

fs.writeFileSync(path, content);
