<template>
  <div>
    <router-link to="/">ホームへ</router-link>
    <hr>
    <div id="main">
      <div id="sample">
        <OcvfButton
            v-for="process in processDefinitions"
            :name="process.name"
            :label="process.label"
            :icon-label="process.icon"
            :process-id="process.processId"
            @click="addBlock"
        >
          {{process.label}}
        </OcvfButton>
      </div>


      <svg id="svg-canvas" @pointermove="onPointerMove" @pointerup="stopDrag" @pointerdown="onPointerDown">
        <!--<OcvfTile :icon-label="iconLabel" :x="10" :y="10" @blockSelected="startDragBlock"/>-->
        <!--<OcvfTile v-for="block in blocks" :block-id="block.blockId" :icon-label="block.iconLabel" :x="block.x" :y="block.y" @blockSelected="startDragBlock"/>-->
        <OcvfBlock
            v-for="block in blocks"
            :block-id="block.blockId"
            :icon-label="block.iconLabel"
            :x="block.x" :y="block.y"
            :dragging="dragging"
            :exec-button="block.execButton"
            :process-id="block.processId"
            @blockSelected="startDragBlock"
            @addLink="addLink"
            @removeBlock="removeBlock"
        />
        <OcvfLink
            v-for="link in links"
            :link-info="link"
            @removeLink="removeLinkWithBlock"
        >
        </OcvfLink>
      </svg>
    </div>
  </div>
</template>

<script>
  // 参考 http://hashrock.hatenablog.com/entry/2017/12/04/215559
  // https://github.com/hashrock-sandbox/study-vue-touch-ui-svg
  // ベジエ曲線上を動かす
  // https://liginc.co.jp/web/html-css/html/154217

  import OcvfButton from './atoms2/OcvfButton'
  import OcvfBlock from "./moleculesSVG/OcvfBlock"
  import OcvfLink from "./moleculesSVG/OcvfLink"
  import {processDefinitions} from "../configs/processDefinitions"
  import closestPoint from "../../main/line";

  export default {
    name: "SvgCanvas",

    components: {
      OcvfButton,
      OcvfBlock,
      OcvfLink
    },

    data: function () {
      return {
        execButton: false,
        dragging: "none",
        processDefinitions: processDefinitions,
        selectedBlockId: 0,
        selectedLinkId: 0,
        selectedPointType: "",
        linkPointType: "",
        links: [],
        dragOffset: {
          x: 0,
          y: 0
        },
      }
    },


    computed: {
      blocks: function () {
        return this.$store.state.blocks
      },
      selectedLink: function () {
        return this.links.find(link => link.id === this.selectedLinkId)
      }
    },

    methods: {
      removeLink: function(linkId) {
        let index = this.links.findIndex(link => link.id === linkId)
        if(index >= 0) {
          this.links.splice(index, 1)
        }
      },

      removeLinkWithBlock: function(linkId){
        let link = this.links.find(link => link.id === linkId)
        let leftBarBlockId  = link.leftBarPoint.blockId
        let rightBarBlockId = link.rightBarPoint.blockId

        this.$store.commit('removeLinkToPreviousBlock', leftBarBlockId)
        this.$store.commit('removeOneLinkFromLinksToNextBlock', {blockId: rightBarBlockId, linkId: linkId})

        this.removeLink(linkId)
        this.$store.commit('reconstructPipelines', this.links)
      },

      doublePointsOnLeftSideBar: function(){
        let leftBarBlockId = this.selectedLink.leftBarPoint.blockId;
        let linksOnLeftSidebar = this.links.filter((link) => {
          return link.leftBarPoint.blockId === leftBarBlockId
        })
        return linksOnLeftSidebar.length > 1

      },

      addBlock: function (ev, iconLabel, processId) {
        const nextLabelId = this.$store.getters.getNextBlockId;
        const block = {
          blockId: nextLabelId,
          iconLabel: iconLabel,
          x: 50,
          y: 50,
          execButton: false,
          processId: processId,
          linksToNextBlock: [],
          parameters: {}
        }
        this.$store.commit('addBlock', block)

      },

      removeBlock: function(ev, blockId){
        // blockに紐づくLinkを消去
        try {
          let block = this.$store.getters.getBlock(this.selectedBlockId)

          console.log('removeBlock')
          for(let i in block.linksToNextBlock){
            console.log(i)
            let linkInfo = block.linksToNextBlock[i]
            this.selectedLinkId = linkInfo.id

            // blockの反対側のLink情報を消す
            let leftBarBlockId = this.selectedLink.leftBarPoint.blockId
            this.$store.commit('removeLinkToPreviousBlock', leftBarBlockId)
            this.removeLink(linkInfo.id)
          }

          if(block.linkToPreviousBlock) {
            let linkInfo = block.linkToPreviousBlock
            this.selectedLinkId = linkInfo.id

            // blockの反対側のLink情報を消す
            let rightBarBlockId = this.selectedLink.rightBarPoint.blockId
            this.$store.commit('removeOneLinkFromLinksToNextBlock', {blockId: rightBarBlockId, linkId: linkInfo.id})
            this.removeLink(linkInfo.id)
          }
        } catch(e){
          console.log(e)
        }

        this.$store.commit('removeBlock', blockId)
        this.$store.commit('reconstructPipelines', this.links)

      },

      startDragBlock: function (ev, blockId, blockX, blockY) {
        if (this.dragging === "drawingPath") this.removeLink(this.selectedLinkId)

        this.dragging = "move";
        this.selectedBlockId = blockId;

        this.$nextTick(() => {
          //ページ左上とオブジェクト左上の差分から、ドラッグ開始位置（オブジェクト相対座標）を取得
          this.dragOffset.x = ev.offsetX - blockX;
          this.dragOffset.y = ev.offsetY - blockY;
        });

      },

      onPointerMove(ev) {
        console.log("dragging: ", this.dragging)
        if (this.dragging === "move") {
          //差分値を基点に反映
          let x = ev.offsetX - this.dragOffset.x;
          let y = ev.offsetY - this.dragOffset.y;
          // selectedBlockの x, yを取得
          let block = this.$store.getters.getBlock(this.selectedBlockId)
          // 今回のx, yとの差分をとる
          // 差分をpoint, pathに反映
          let diffX = x - block.x
          let diffY = y - block.y

          this.$store.commit('updateBlockPosition', {blockId: this.selectedBlockId, x: x, y: y})

          // Linkも同時に動かす
          for(let i in block.linksToNextBlock){
            let linkInfo = block.linksToNextBlock[i]
            this.selectedLinkId = linkInfo.id
            let pathEdge = linkInfo.pathEdge
            let nowX = this.selectedLink.rightBarPoint.x
            let nowY = this.selectedLink.rightBarPoint.y
            this.selectedLink[pathEdge].x = nowX + diffX
            this.selectedLink[pathEdge].y = nowY + diffY
            this.selectedLink.rightBarPoint.x = nowX + diffX
            this.selectedLink.rightBarPoint.y = nowY + diffY
          }

          // for(let i in block.linkToPreviousBlock){
          if(block.linkToPreviousBlock) {
            // let linkInfo = block.linkToPreviousBlock[i]
            let linkInfo = block.linkToPreviousBlock
            this.selectedLinkId = linkInfo.id
            let pathEdge = linkInfo.pathEdge
            let nowX = this.selectedLink.leftBarPoint.x
            let nowY = this.selectedLink.leftBarPoint.y
            this.selectedLink[pathEdge].x = nowX + diffX
            this.selectedLink[pathEdge].y = nowY + diffY
            this.selectedLink.leftBarPoint.x = nowX + diffX
            this.selectedLink.leftBarPoint.y = nowY + diffY
          }

        }

        if (this.dragging === "firstPointMove") {
          let pathNode = this.selectedLink[this.selectedPointType].on
          let x = ev.offsetX - this.dragOffset.x;
          let y = ev.offsetY - this.dragOffset.y;
          let posOnBar = closestPoint(pathNode, [x, y])

          this.selectedLink[this.selectedPointType].x = posOnBar[0];
          this.selectedLink[this.selectedPointType].y = posOnBar[1];
        }

        if (this.dragging === "drawingPath") {
          let x = ev.offsetX - this.dragOffset.x
          let y = ev.offsetY - this.dragOffset.y
          // ポインタをpath上からずらしてイベント検知しやすくする
          if(this.selectedLink.pathStart.x < x){
            this.selectedLink.pathEnd.x = x - 3
          } else{
            this.selectedLink.pathEnd.x = x + 3
          }
          this.selectedLink.pathEnd.y = y
        }

        if (this.dragging === "secondPointMove"){
          let pathNode = this.selectedLink[this.selectedPointType].on
          let x = ev.offsetX - this.dragOffset.x;
          let y = ev.offsetY - this.dragOffset.y;
          let posOnBar = closestPoint(pathNode, [x, y])

          this.selectedLink.pathEnd.x = posOnBar[0];
          this.selectedLink.pathEnd.y = posOnBar[1];
          this.selectedLink[this.selectedPointType].x = posOnBar[0];
          this.selectedLink[this.selectedPointType].y = posOnBar[1];
        }

      },

      onPointerDown(ev){
        // キャンバス上のなにもない部分を押したとき、作成中のリンクを消す
        if (this.dragging === "drawingPath") this.removeLink(this.selectedLinkId)
      },

      stopDrag(ev) {
        console.log("drag End!")
        if (this.dragging === "firstPointMove") {
          // Linkの最初の点の位置が定まったのでPathの描画にうつる
          this.dragging = "drawingPath";
          this.selectedLink.pathStart.x = this.selectedLink[this.selectedPointType].x;
          this.selectedLink.pathStart.y = this.selectedLink[this.selectedPointType].y;
        } else if (this.dragging !== "none") {
          this.dragging = "none";
        }

        this.selectedBlockId = "";
      },

      addLink(ev, point) {
        if(this.dragging === "drawingPath"){
          if(this.selectedPointType === point.pointType){
            // サイドバーの種類が同じ場合、linkを消す
            this.selectedPointType = ""
            this.removeLink(this.selectedLinkId)

          } else{
            this.selectedPointType = point.pointType
            this.selectedLink[this.selectedPointType].blockId = point.blockId

            // 同じブロックの場合、リンクを消す
            if(this.selectedLink.leftBarPoint.blockId === this.selectedLink.rightBarPoint.blockId){
              // linkを消す
              this.selectedPointType = ""
              this.removeLink(this.selectedLinkId)
              return
            }

            // leftSidebarにリンクが2つつながる場合、リンクを消す (同じリンクの場合を包含)
            if(this.doublePointsOnLeftSideBar()){
              this.selectedPointType = ""
              this.removeLink(this.selectedLinkId)
              return
            }

            if(this.doesThisLinkMakeLoop()){

            }

            // TODO: ループが形成されてしまう場合、リンクを消す
            this.selectedPointType = point.pointType
            this.dragging = "secondPointMove"

            this.selectedLink[this.selectedPointType].x = point.x
            this.selectedLink[this.selectedPointType].y = point.y
            this.selectedLink[this.selectedPointType].on = point.on
            this.selectedLink[this.selectedPointType].display = true

            this.updateLinkOfBlock() // this.selectedLink.leftBarPoint.blockId, this.selectedLink.rightBarPoint.blockId
            this.$store.commit('reconstructPipelines', this.links)
          }
          return
        }

        const link = {
          id: this.$store.getters.getNextLinkId,
          pointType: point.pointType,
          // path: false,
          leftBarPoint: {x: 0, y: 0, on: "", display: false, blockId: 0},
          rightBarPoint: {x: 0, y: 0, on: "", display: false, blockId: 0},
          pathStart: {x: 0, y: 0},
          pathEnd: {x: 0, y: 0},
        }

        link[point.pointType].x = point.x
        link[point.pointType].y = point.y
        link.pathStart.x        = point.x
        link.pathStart.y        = point.y
        link.pathEnd.x          = point.x
        link.pathEnd.y          = point.y
        link[point.pointType].blockId = point.blockId
        link[point.pointType].on = point.on // sidebarの要素
        link[point.pointType].display = true

        this.$store.commit('incrementNextLinkId')
        this.dragging = "firstPointMove"
        this.links.push(link)
        this.selectedLinkId = link.id
        this.selectedPointType = point.pointType

        this.$nextTick(() => {
          //ページ左上とオブジェクト左上の差分から、ドラッグ開始位置（オブジェクト相対座標）を取得
          this.dragOffset.x = ev.offsetX - point.x;
          this.dragOffset.y = ev.offsetY - point.y;
        });

      },

      doesThisLinkMakeLoop: function(){
        return false
      },

      updateLinkOfBlock: function(){
        let rightBarBlockId = this.selectedLink.rightBarPoint.blockId
        let leftBarBlockId     = this.selectedLink.leftBarPoint.blockId
        let rightBarBlockPathEdge
        let leftBarBlockPathEdge

        if(this.selectedPointType === 'leftBarPoint'){
          leftBarBlockPathEdge = 'pathEnd'
          rightBarBlockPathEdge = 'pathStart'
        } else {
          leftBarBlockPathEdge = 'pathStart'
          rightBarBlockPathEdge = 'pathEnd'
        }

        this.$store.commit('updateLinksToNextBlock', {blockId: rightBarBlockId, linkId: this.selectedLinkId, pathEdge: rightBarBlockPathEdge})
        this.$store.commit('updateLinkToPreviousBlock', {blockId: leftBarBlockId, linkId: this.selectedLinkId, pathEdge: leftBarBlockPathEdge})

      },

    }

  }
</script>

<style scoped>
  #main {
    display: flex;
  }

  #sample {
    width: 200px;
    border: solid #444444;
    border-width: 0px 1px 0em 0px;
  }

  #svg-canvas {
    width: 800px;
    height: 800px;
  }

</style>
