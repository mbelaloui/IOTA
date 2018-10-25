import Vue from 'vue';
import Sidebar from '../../src/components/nav.vue';

describe('Sidebar.vue', () => {
    it('should not render contacts if seed is undefined', () => {
        const Constructor = Vue.extend(Sidebar);
        const vm = new Constructor({
            propsData: { store: {
                account: {
                },
                node: {
                    appVersion: '1.4.2'
                },
            } }
        }).$mount();
        expect(vm.$el.querySelector('#contacts')).to.be.equal(null);
    });
});