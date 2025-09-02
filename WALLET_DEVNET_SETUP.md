# Wallet Devnet Setup Guide 🦊

## 🎯 **Goal: Switch Your Wallet to Devnet**

Your frontend is now configured for **devnet**, but you need to switch your wallet to devnet to test it.

## 📱 **Step-by-Step Wallet Setup**

### **Phantom Wallet (Most Common)**

1. **Open Phantom Wallet** in your browser
2. **Click the gear icon** ⚙️ (Settings)
3. **Go to Developer Settings**
4. **Click "Change Network"**
5. **Select "Devnet"**
6. **Confirm the change**

### **Solflare Wallet**

1. **Open Solflare Wallet** in your browser
2. **Click the gear icon** ⚙️ (Settings)
3. **Go to Networks**
4. **Click "Add Network"** or select **Devnet**
5. **Confirm the change**

### **Other Wallets**

Look for similar options:
- **Settings** → **Networks** → **Devnet**
- **Developer Settings** → **Change Network** → **Devnet**

## 🔍 **Verify Your Setup**

### **1. Check Your Wallet Network**
- Your wallet should show "Devnet" somewhere in the interface
- The network indicator should be different (often shows a different color)

### **2. Check Your SOL Balance**
- You should see your **12 SOL** balance
- The balance should be labeled as "Devnet SOL" or similar

### **3. Test the Frontend**
- Open http://localhost:3000
- Click "Connect Wallet"
- The network indicator should show "Devnet"
- Your wallet should connect successfully

## 🚨 **Common Issues & Solutions**

### **Issue: Wallet still shows "Mainnet" or "Testnet"**
**Solution:** Make sure you selected "Devnet" and confirmed the change

### **Issue: Can't find network settings**
**Solution:** Look for "Developer Settings" or "Advanced Settings"

### **Issue: Frontend still shows "Testnet"**
**Solution:** Refresh the page (Ctrl+F5 or Cmd+Shift+R)

### **Issue: Wallet won't connect**
**Solution:** Make sure both your wallet AND the frontend are on devnet

## ✅ **Success Checklist**

- [ ] Wallet shows "Devnet" network
- [ ] Wallet shows 12 SOL balance
- [ ] Frontend shows "Devnet" network indicator
- [ ] Wallet connects successfully
- [ ] No connection errors

## 🌐 **Test Your Launchpad**

Once everything is working:

1. **Navigate to different pages** (Create, Explore, etc.)
2. **Test wallet interactions**
3. **Verify network detection**
4. **Check responsive design**

## 🆘 **Still Having Issues?**

If you're still having trouble:

1. **Restart your wallet** (refresh the page)
2. **Clear browser cache** (Ctrl+Shift+Delete)
3. **Try a different wallet** (Phantom, Solflare, etc.)
4. **Check browser console** for errors

## 🎉 **You're Almost There!**

Your launchpad is fully configured for devnet. Once you switch your wallet, you'll be able to test everything!

**Next step:** Switch your wallet to devnet and test the frontend at http://localhost:3000

