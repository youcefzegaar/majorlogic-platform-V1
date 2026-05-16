const fs = require('fs');
const path = 'c:\\Users\\SAN\\majorlogic-platform-v1\\apps\\search-ui\\src\\App.jsx';
let content = fs.readFileSync(path, 'utf8');

// Fix Phase 2
// Find the block:
//                   ))}
//                 </div>
//               </div>
//
//               {/* Sidebar */}
// And change it to:
//                   ))}
//                 </div>
//               )}
//             </div>
//
//               {/* Sidebar */}

const phase2Target = /}\)\)\s*<\/div>\s*<\/div>\s*(\/\* Sidebar \*\/)/m;
const phase2Fix = '}))\n                </div>\n              )}\n            </div>\n\n            $1';

content = content.replace(phase2Target, phase2Fix);

// Fix Phase 4
// Find the block:
//                     ))}
//                   </div>
//                 )}
//               </div>
//               </div>
// And change it to:
//                     ))}
//                   </div>
//                 </div>
//               </div>

const phase4Target = /}\)\)\s*<\/div>\s*}\)\s*<\/div>\s*<\/div>/m;
const phase4Fix = '}))\n                  </div>\n                </div>\n              </div>';

content = content.replace(phase4Target, phase4Fix);

fs.writeFileSync(path, content);
console.log('App.jsx fixed successfully');
