
import React, { useState } from 'react';
import { ShoppingBag, Coins, Lock, CheckCircle, Image as ImageIcon, Sparkles, User, Palette } from 'lucide-react';
import { Employee, ShopItem, ShopCategory } from '../types';
import { SHOP_CATALOG } from '../utils/mockData';
import { Modal } from './Modal';

interface ShopPageProps {
  currentUser: Employee;
  onUpdateEmployee: (updated: Employee) => void;
  onShowToast: (msg: string) => void;
}

const ShopPage: React.FC<ShopPageProps> = ({ currentUser, onUpdateEmployee, onShowToast }) => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory | 'All'>('All');
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);

  const filteredItems = SHOP_CATALOG.filter(item => 
      activeCategory === 'All' || item.category === activeCategory
  );

  const handlePurchase = () => {
      if (!selectedItem) return;

      if (currentUser.walletBalance < selectedItem.price) {
          onShowToast('Niet genoeg Sanacoins!');
          return;
      }

      const updatedUser = {
          ...currentUser,
          walletBalance: currentUser.walletBalance - selectedItem.price,
          inventory: [...currentUser.inventory, selectedItem.id]
      };

      onUpdateEmployee(updatedUser);
      onShowToast(`Je hebt "${selectedItem.name}" gekocht!`);
      setSelectedItem(null);
  };

  const handleEquip = (item: ShopItem) => {
      const activeCosmetics = { ...currentUser.activeCosmetics };
      
      if (item.category === 'Frame') activeCosmetics.frameId = item.id;
      if (item.category === 'Banner') activeCosmetics.bannerId = item.id;
      if (item.category === 'NameColor') activeCosmetics.nameColorId = item.id;
      if (item.category === 'Theme') activeCosmetics.themeId = item.id;

      const updatedUser = {
          ...currentUser,
          activeCosmetics
      };

      onUpdateEmployee(updatedUser);
      onShowToast(`"${item.name}" geactiveerd!`);
      setSelectedItem(null);
  };

  const handleUnequip = (item: ShopItem) => {
     const activeCosmetics = { ...currentUser.activeCosmetics };
      
      if (item.category === 'Frame') activeCosmetics.frameId = undefined;
      if (item.category === 'Banner') activeCosmetics.bannerId = undefined;
      if (item.category === 'NameColor') activeCosmetics.nameColorId = undefined;
      if (item.category === 'Theme') activeCosmetics.themeId = undefined;

      const updatedUser = {
          ...currentUser,
          activeCosmetics
      };

      onUpdateEmployee(updatedUser);
      onShowToast(`"${item.name}" gedeactiveerd.`);
      setSelectedItem(null);
  };

  const isOwned = (itemId: string) => currentUser.inventory.includes(itemId);
  
  const isEquipped = (itemId: string) => {
      return Object.values(currentUser.activeCosmetics).includes(itemId);
  };

  const categories = [
      { id: 'All', label: 'Alles', icon: ShoppingBag },
      { id: 'Frame', label: 'Frames', icon: User },
      { id: 'Banner', label: 'Banners', icon: ImageIcon },
      { id: 'NameColor', label: 'Kleuren', icon: Palette },
      { id: 'Theme', label: 'Thema\'s', icon: Sparkles },
  ];

  return (
    <div className="p-4 md:p-8 2xl:p-12 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 min-h-screen">
       
       <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
           <div>
               <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sanadome Rewards</h1>
               <p className="text-slate-500 mt-1">Geef je profiel een upgrade met je verdiende punten.</p>
           </div>
           
           <div className="bg-amber-100 border border-amber-200 rounded-2xl px-8 py-4 flex items-center gap-4 shadow-sm">
               <div className="bg-amber-400 p-3 rounded-full text-white shadow-sm">
                   <Coins size={32} fill="currentColor"/>
               </div>
               <div>
                   <div className="text-xs font-bold text-amber-700 uppercase tracking-wider">Jouw Saldo</div>
                   <div className="text-3xl font-extrabold text-amber-900">{currentUser.walletBalance}</div>
               </div>
           </div>
       </div>

       {/* Category Tabs */}
       <div className="flex items-center gap-4 mb-8 overflow-x-auto pb-4 no-scrollbar">
           {categories.map((cat) => (
               <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${
                      activeCategory === cat.id 
                      ? 'bg-slate-900 text-white shadow-lg scale-105' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
               >
                   <cat.icon size={18}/>
                   {cat.label}
               </button>
           ))}
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {filteredItems.map(item => {
               const owned = isOwned(item.id);
               const equipped = isEquipped(item.id);

               return (
                   <div 
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`bg-white rounded-2xl border transition-all cursor-pointer overflow-hidden group hover:-translate-y-1 ${
                          equipped ? 'border-teal-500 ring-2 ring-teal-500 shadow-md' : 'border-slate-200 hover:shadow-xl hover:border-slate-300'
                      }`}
                   >
                       {/* Preview Area */}
                       <div className="h-40 bg-slate-50 relative flex items-center justify-center overflow-hidden">
                           {item.category === 'Banner' ? (
                               <img src={item.previewValue} className="w-full h-full object-cover" alt={item.name}/>
                           ) : item.category === 'Frame' ? (
                               <div className="relative">
                                    <div className={`w-24 h-24 rounded-full bg-slate-200 border-4 border-white ${item.previewValue}`}></div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                        <User size={40} className="text-slate-400"/>
                                    </div>
                               </div>
                           ) : item.category === 'Theme' ? (
                                <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: item.previewValue}}>
                                    <span className="text-white font-bold opacity-80">Thema</span>
                                </div>
                           ) : (
                                <span className={`text-2xl ${item.previewValue}`}>Naam</span>
                           )}

                           {owned && (
                               <div className="absolute top-3 right-3 bg-green-500 text-white p-1.5 rounded-full shadow-sm z-10">
                                   <CheckCircle size={16} />
                               </div>
                           )}
                       </div>

                       <div className="p-5">
                           <div className="flex justify-between items-start mb-2">
                               <div>
                                   <h3 className="font-bold text-slate-900">{item.name}</h3>
                                   <div className="text-xs text-slate-500 font-medium">{item.category}</div>
                               </div>
                               {!owned && (
                                   <div className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                       <Coins size={12} fill="currentColor"/> {item.price}
                                   </div>
                               )}
                           </div>
                           
                           {equipped ? (
                               <div className="mt-4 w-full py-2 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold text-center uppercase tracking-wide border border-teal-100">
                                   Geactiveerd
                               </div>
                           ) : owned ? (
                               <div className="mt-4 w-full py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold text-center uppercase tracking-wide">
                                   In bezit
                               </div>
                           ) : (
                               <div className="mt-4 w-full py-2 border border-slate-200 text-slate-400 rounded-lg text-xs font-bold text-center uppercase tracking-wide group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-colors">
                                   Bekijken
                               </div>
                           )}
                       </div>
                   </div>
               )
           })}
       </div>

       {/* Detail Modal */}
       {selectedItem && (
           <Modal 
             isOpen={!!selectedItem}
             onClose={() => setSelectedItem(null)}
             title={selectedItem.name}
           >
               <div className="space-y-6">
                   <div className="h-48 bg-slate-50 rounded-xl flex items-center justify-center overflow-hidden border border-slate-100">
                        {selectedItem.category === 'Banner' ? (
                               <img src={selectedItem.previewValue} className="w-full h-full object-cover" alt={selectedItem.name}/>
                           ) : selectedItem.category === 'Frame' ? (
                               <div className="relative scale-150">
                                    <div className={`w-24 h-24 rounded-full bg-slate-200 border-4 border-white ${selectedItem.previewValue}`}>
                                        <img src={currentUser.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar"/>
                                    </div>
                               </div>
                           ) : selectedItem.category === 'Theme' ? (
                                <div className="w-full h-full flex items-center justify-center" style={{backgroundColor: selectedItem.previewValue}}>
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 text-white">
                                        <h4 className="font-bold">Voorbeeld</h4>
                                        <p className="text-sm opacity-80">Zo ziet het menu eruit.</p>
                                    </div>
                                </div>
                           ) : (
                                <div className="text-center">
                                    <span className={`text-3xl ${selectedItem.previewValue}`}>{currentUser.name}</span>
                                </div>
                           )}
                   </div>

                   <div>
                       <h3 className="text-lg font-bold text-slate-900 mb-2">Beschrijving</h3>
                       <p className="text-slate-600">{selectedItem.description}</p>
                   </div>
                   
                   <div className="pt-4 flex gap-3">
                       {isOwned(selectedItem.id) ? (
                           isEquipped(selectedItem.id) ? (
                               <button 
                                 onClick={() => handleUnequip(selectedItem)}
                                 className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                               >
                                   Uitschakelen
                               </button>
                           ) : (
                               <button 
                                 onClick={() => handleEquip(selectedItem)}
                                 className="flex-1 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-colors shadow-lg"
                               >
                                   Activeren
                               </button>
                           )
                       ) : (
                           <button 
                             onClick={handlePurchase}
                             disabled={currentUser.walletBalance < selectedItem.price}
                             className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                           >
                               {currentUser.walletBalance < selectedItem.price ? (
                                   <>Te weinig saldo <Lock size={16}/></>
                               ) : (
                                   <>Kopen voor {selectedItem.price} <Coins size={16}/></>
                               )}
                           </button>
                       )}
                   </div>
               </div>
           </Modal>
       )}

    </div>
  );
};

export default ShopPage;
