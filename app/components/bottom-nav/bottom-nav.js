Component({
  properties: {
    activeTab: {
      type: String,
      value: 'home'
    }
  },
  methods: {
    onSwitchTab(e) {
      console.log('onSwitchTab', e);
      
      const { path, tab } = e.currentTarget.dataset;
      if (tab=='user') {
        const {
          query: { deviceId }
        } = ty.getLaunchOptionsSync();
         
        ty.device.openDeviceDetailPage({
          deviceId,
          success: () => {
            console.log('openDeviceDetailPage success');
          },
          fail: (error) => {
            console.log('openDeviceDetailPage fail', error);
          }
        });
        return
      }
      if (tab === this.data.activeTab) return;
      
      ty.redirectTo({
        url: path,
        fail: (err) => {
          console.log('Nav failed', err);
        }
      });
    }
  }
});
