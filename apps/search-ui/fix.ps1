$path = "c:\Users\SAN\majorlogic-platform-v1\apps\search-ui\src\App.jsx"
$content = Get-Content $path
# Fix line 898 (index 897)
$content[897] = "                )}"
$content[898] = "              </div>"
# Fix line 1173 (index 1172) - remove the extra )}
$content[1172] = "                  </div>"
$content | Set-Content $path
