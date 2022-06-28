RET=1
until [ ${RET} -eq 17771 ]; do
    node build/index.js
    RET=$?
    sleep 1
done