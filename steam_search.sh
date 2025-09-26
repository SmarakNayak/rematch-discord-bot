#!/bin/bash

# Command 1: Fetch the search page to get new cookies
curl -i -L \
-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
-H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7" \
-H "Accept-Language: en-GB,en;q=0.9" \
-H "Cache-Control: no-cache" \
-H "Connection: keep-alive" \
-H "Pragma: no-cache" \
-H "Sec-Ch-Ua: \"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"" \
-H "Sec-Ch-Ua-Mobile: ?0" \
-H "Sec-Ch-Ua-Platform: \"Windows\"" \
-H "Sec-Fetch-Dest: document" \
-H "Sec-Fetch-Mode: navigate" \
-H "Sec-Fetch-Site: none" \
-H "Sec-Fetch-User: ?1" \
-H "Upgrade-Insecure-Requests: 1" \
--cookie-jar cookies.txt \
https://steamcommunity.com/search/users/

# Extract sessionid from cookies.txt
SESSIONID=$(grep 'sessionid' cookies.txt | awk '{print $7}')

if [ -z "$SESSIONID" ]; then
  echo "Error: No sessionid found in cookies.txt"
  exit 1
fi

echo "Using sessionid: $SESSIONID"

# Command 2: Query the AJAX endpoint using cookies from cookies.txt
curl -i -L \
-H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36" \
-H "Accept: application/json, text/javascript, */*; q=0.01" \
-H "Accept-Language: en-GB,en;q=0.9" \
-H "Cache-Control: no-cache" \
-H "Connection: keep-alive" \
-H "Pragma: no-cache" \
-H "Sec-Ch-Ua: \"Chromium\";v=\"140\", \"Not=A?Brand\";v=\"24\", \"Google Chrome\";v=\"140\"" \
-H "Sec-Ch-Ua-Mobile: ?0" \
-H "Sec-Ch-Ua-Platform: \"Windows\"" \
-H "Sec-Fetch-Dest: empty" \
-H "Sec-Fetch-Mode: cors" \
-H "Sec-Fetch-Site: same-origin" \
-H "X-Requested-With: XMLHttpRequest" \
-H "Origin: https://steamcommunity.com" \
--cookie cookies.txt \
"https://steamcommunity.com/search/SearchCommunityAjax?text=mumshagger&filter=users&sessionid=$SESSIONID&steamid_user=false&page=1"
