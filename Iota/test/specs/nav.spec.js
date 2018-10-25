import Vue from 'vue';
import Nav from '../../src/components/nav.vue';

describe('Nav.vue', () => {
    it('should render correct contents', () => {
        const Constructor = Vue.extend(Nav);
        const vm = new Constructor({
            propsData: { store: {
                account: {
                    seed: 'HOLYSEED',
                },
                node: {
                    appVersion: '1.4.2'
                },
            } }
        }).$mount();
        expect(vm.$el.querySelector('#iota-version').innerHTML.trim()).to.be.equal('iota version: 1.4.2');
        expect(vm.$el.querySelector('#seed').innerText.trim()).to.be.equal('HOLYSEED\n      logout');
    });
});