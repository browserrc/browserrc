import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createAction } from './rpc.js';

describe('RPC - createAction', () => {
    test('determinism: same function results in same action ID', () => {
        const fn = ({ ctx }) => console.log('hello');
        const action1 = createAction(fn);
        const action2 = createAction(fn);

        assert.strictEqual(action1.id, action2.id);
        assert.ok(action1.id.startsWith('action_'));
    });

    test('uniqueness: different functions result in different action IDs', () => {
        const fn1 = ({ ctx }) => console.log('hello');
        const fn2 = ({ ctx }) => console.log('world');

        const action1 = createAction(fn1);
        const action2 = createAction(fn2);

        assert.notStrictEqual(action1.id, action2.id);
    });

    test('uniqueness: different function bodies (even slightly) result in different action IDs', () => {
        const fn1 = ({ ctx }) => { console.log('test'); };
        const fn2 = ({ ctx }) => {
            console.log('test');
        };

        const action1 = createAction(fn1);
        const action2 = createAction(fn2);

        assert.notStrictEqual(action1.id, action2.id);
    });
});
