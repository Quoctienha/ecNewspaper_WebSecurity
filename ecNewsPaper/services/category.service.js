import db from '../utils/db.js';

export default{
    //Categories
    findAllCategories() {
       return db('categories').orderBy('CID', 'asc');
    },

    findCategoriesWithLimitOffset(limit, offset) {
        return db('categories').orderBy('CID', 'asc').limit(limit).offset(offset);
    },

    findCategoriesByCID(CID){
        return db('categories').where('CID', CID).first();

    },
    countAllCategories() {
        return db('categories').count('* as total').first();
    },

    addCategories(category) {
        return db('categories').insert(category);
    },

    deleteCategories(CatID) {
        return db('categories').where('CID', CatID).del();
    },

    updateCategories(category) {
        return db('categories')
            .where('CID', category.CID)
            .update('CName', category.CName);
    },

    countCategoriesByEID(editorID){
        return db('categories').where('EID',editorID).count('* as total').first();
    },

    findCategoriesByEID(editorID, limit, offset){
        return db('categories').where('EID', editorID).orderBy('CID', 'asc').limit(limit).offset(offset);
    },

    findCategoriesNotManagedByEID(editorID){
        return db('categories')
            .where(function () {
                this.where('EID', '!=', editorID).orWhereNull('EID');
            });
    },

    addManageCategory(CID, EID){
        return db('categories')
            .where('CID', CID)
            .update('EID', EID);
    },

    delManageCategory(CID){
        return db('categories')
            .where('CID', CID)
            .update({
                EID: null, // Đặt giá trị của cột thành NULL
            })
    },

    //sub Categories
    findSubCategoriesBySCID(SCID) {
        return db('subcategories').where('SCID', SCID).first();
    },

    findSubCategoriesByCID(CID){
        return db('subcategories').where('CID', CID).orderBy('SCID', 'asc');
    },

    addSubcategory(subcategory) {
        return db('subcategories').insert(subcategory);
    },

    deleteSubcategory(SCID) {
        return db('subcategories').where('SCID', SCID).del();
    },

    updateSubcategory(subcategory) {
        return db('subcategories')
            .where('SCID', subcategory.SCID)
            .update('SCName', subcategory.SCName);
    }
    
}