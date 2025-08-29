#!/bin/sh

node ../server/index.cjs & SERVER_PID=$! ;

if [ "$1" = "node" ] ; then
	node --test ;
elif [ "$1" = "tap" ] ; then
	tap run --allow-empty-coverage --allow-incomplete-coverage;
else
	node test.mjs "$@";
fi

TEST_EXIT=$? ;
kill $SERVER_PID ;
exit $TEST_EXIT ;
